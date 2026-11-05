/* Copyright 2026 Piotr Adamski (piotr-adamski)
 * SPDX-License-Identifier: Apache-2.0 */
#include <emscripten.h>
#include <libssh2.h>
#include <openssl/evp.h>
#include <openssl/pem.h>
#include <openssl/pkcs12.h>
#include <openssl/rand.h>
#include <openssl/sha.h>
#include <openssl/crypto.h>
#include <sys/socket.h>
#include <netdb.h>
#include <poll.h>
#include <fcntl.h>
#include <unistd.h>
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

static LIBSSH2_SESSION *session;
static LIBSSH2_CHANNEL *channel;
static int sock = -1, phase, trusted, force_rng_failure;
static char error_code[64], result[18000], command[160], username[128];
static char *plain_key;
static size_t plain_key_size;
static int cols=80, rows=24;
static int sent_cols,sent_rows,resize_cols,resize_rows,resize_inflight;
static double last_response;
static ssize_t receive_transport(libssh2_socket_t fd,void *buffer,size_t length,int flags,void **abstract) {
  (void)abstract;
  ssize_t count=recv(fd,buffer,length,flags);
  if(count>0)last_response=emscripten_get_now();
  return count<0 ? -errno:count;
}

EM_JS(int, platform_random, (unsigned char *out, int length), {
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') return 0;
  try {
    for (var i=0; i<length; i+=65536) crypto.getRandomValues(HEAPU8.subarray(out+i,out+Math.min(length,i+65536)));
    return 1;
  } catch (_) { return 0; }
});

static int random_bytes(unsigned char *out, int count) {
  if (force_rng_failure || !platform_random(out,count)) { OPENSSL_cleanse(out,count); return 0; }
  return 1;
}
static int random_status(void) { unsigned char b; return random_bytes(&b,1); }
static int random_seed(const void *data, int count) { (void)data; (void)count; return 1; }
static int random_add(const void *data,int count,double entropy) { (void)data; (void)count; (void)entropy; return 1; }
static RAND_METHOD random_method={random_seed,random_bytes,NULL,random_add,random_bytes,random_status};

static int fail(const char *code) { snprintf(error_code,sizeof(error_code),"%s",code); phase=-1; return -1; }
const char *ts_error(void) { return error_code; }
static void clear_key(void) {
  if (plain_key) { OPENSSL_clear_free(plain_key,plain_key_size); plain_key=NULL; plain_key_size=0; }
}
static char *base64(const unsigned char *data,int length) {
  char *out=malloc(4*((length+2)/3)+1);
  if (out) EVP_EncodeBlock((unsigned char *)out,data,length);
  return out;
}
static unsigned char *unbase64(const char *data,int *size) {
  int length=strlen(data);
  if (!length || length>12000 || length%4) return NULL;
  unsigned char *out=malloc(length);
  if (!out) return NULL;
  int n=EVP_DecodeBlock(out,(const unsigned char *)data,length);
  if(n<0) { free(out); return NULL; }
  if (data[length-1]=='=') --n;
  if (data[length-2]=='=') --n;
  *size=n; return out;
}
int ts_init(void) {
  error_code[0]=0;
  if (!RAND_set_rand_method(&random_method) || !random_status()) return fail("RNG_UNAVAILABLE");
  if (libssh2_init(0)) return fail("SSH_INIT_FAILED");
  return 1;
}
int ts_rng_test(int simulate_failure) {
  unsigned char bytes[32]; force_rng_failure=simulate_failure;
  int ok=RAND_bytes(bytes,sizeof(bytes));
  OPENSSL_cleanse(bytes,sizeof(bytes)); force_rng_failure=0;
  return ok==1;
}
static void clear_password(char *password) { if(password)OPENSSL_cleanse(password,strlen(password)); }
const char *ts_generate(char *password) {
  result[0]=0;
  if (!password || !*password || strlen(password)>1024) { clear_password(password); fail("INVALID_PASSPHRASE"); return NULL; }
  EVP_PKEY_CTX *ctx=EVP_PKEY_CTX_new_id(EVP_PKEY_ED25519,NULL);
  EVP_PKEY *key=NULL;
  if(!ctx || EVP_PKEY_keygen_init(ctx)<=0 || EVP_PKEY_keygen(ctx,&key)<=0) {
    EVP_PKEY_CTX_free(ctx); clear_password(password); fail("KEY_GENERATION_FAILED"); return NULL;
  }
  EVP_PKEY_CTX_free(ctx);
  unsigned char public_raw[32],blob[51],salt[16]; size_t length=32;
  if(!EVP_PKEY_get_raw_public_key(key,public_raw,&length) || length!=32 || !random_bytes(salt,sizeof(salt))) {
    EVP_PKEY_free(key); clear_password(password); fail("RNG_UNAVAILABLE"); return NULL;
  }
  memcpy(blob,"\0\0\0\13ssh-ed25519\0\0\0\40",19); memcpy(blob+19,public_raw,32);
  PKCS8_PRIV_KEY_INFO *info=EVP_PKEY2PKCS8(key);
  X509_SIG *encrypted=info ? PKCS8_encrypt(-1,EVP_aes_256_cbc(),password,strlen(password),salt,sizeof(salt),600000,info):NULL;
  clear_password(password);
  BIO *bio=BIO_new(BIO_s_mem());
  if(!encrypted || !bio || !PEM_write_bio_PKCS8(bio,encrypted)) {
    BIO_free(bio); X509_SIG_free(encrypted); PKCS8_PRIV_KEY_INFO_free(info); EVP_PKEY_free(key);
    fail("KEY_ENCRYPTION_FAILED"); return NULL;
  }
  char *pem; long size=BIO_get_mem_data(bio,&pem);
  char *pub=base64(blob,sizeof(blob)), *secret=base64((unsigned char *)pem,size);
  if(pub && secret) snprintf(result,sizeof(result),"{\"algorithm\":\"ssh-ed25519\",\"publicKey\":\"ssh-ed25519 %s\",\"encryptedPrivateKey\":\"%s\",\"keyFormatVersion\":1}",pub,secret);
  free(pub); free(secret); BIO_free(bio); X509_SIG_free(encrypted); PKCS8_PRIV_KEY_INFO_free(info); EVP_PKEY_free(key);
  return *result ? result:NULL;
}

void ts_close(void) {
  clear_key();
  if(sock>=0) shutdown(sock,SHUT_RDWR);
  if(channel) { libssh2_channel_free(channel); channel=NULL; }
  if(session) { libssh2_session_free(session); session=NULL; }
  if(sock>=0) { close(sock); sock=-1; }
  trusted=0; phase=0;resize_inflight=0;sent_cols=sent_rows=0;
}
int ts_connect(const char *host,int port) {
  ts_close(); error_code[0]=0;
  if(!host || !*host || strlen(host)>253 || port<1 || port>65535) return fail("INVALID_TARGET");
  struct addrinfo hints={0}, *address=NULL; char service[8];
  hints.ai_family=AF_INET; hints.ai_socktype=SOCK_STREAM; snprintf(service,sizeof(service),"%d",port);
  if(getaddrinfo(host,service,&hints,&address)) return fail("DNS_FAILED");
  /* Tizen supports SOCK_NONBLOCK at creation, not fcntl(F_SETFL) on sockets. */
  sock=socket(address->ai_family,SOCK_STREAM|SOCK_NONBLOCK,0);
  if(sock<0) { freeaddrinfo(address); return fail("SOCKET_FAILED"); }
  int rc=connect(sock,address->ai_addr,address->ai_addrlen); freeaddrinfo(address);
  if(rc && errno!=EINPROGRESS && errno!=EWOULDBLOCK) return fail("TCP_CONNECT_FAILED");
  session=libssh2_session_init(); if(!session) return fail("SSH_INIT_FAILED");
  libssh2_session_set_blocking(session,0);
  libssh2_session_callback_set(session,LIBSSH2_CALLBACK_RECV,(void *)receive_transport);
  last_response=emscripten_get_now();
  if(libssh2_session_method_pref(session,LIBSSH2_METHOD_KEX,"curve25519-sha256,curve25519-sha256@libssh.org") ||
     libssh2_session_method_pref(session,LIBSSH2_METHOD_HOSTKEY,"ssh-ed25519") ||
     libssh2_session_method_pref(session,LIBSSH2_METHOD_CRYPT_CS,"aes256-gcm@openssh.com,aes128-gcm@openssh.com") ||
     libssh2_session_method_pref(session,LIBSSH2_METHOD_CRYPT_SC,"aes256-gcm@openssh.com,aes128-gcm@openssh.com") ||
     libssh2_session_method_pref(session,LIBSSH2_METHOD_MAC_CS,"hmac-sha2-256-etm@openssh.com,hmac-sha2-256") ||
     libssh2_session_method_pref(session,LIBSSH2_METHOD_MAC_SC,"hmac-sha2-256-etm@openssh.com,hmac-sha2-256"))return fail("SSH_ALGORITHMS_UNAVAILABLE");
  libssh2_keepalive_config(session,1,30);
  phase=rc ? 1:2; return phase;
}
const char *ts_hostkey(void) {
  size_t length; int type;
  const char *key=libssh2_session_hostkey(session,&length,&type);
  if(!key || type!=LIBSSH2_HOSTKEY_TYPE_ED25519) { fail("HOSTKEY_UNSUPPORTED"); return NULL; }
  unsigned char digest[SHA256_DIGEST_LENGTH]; SHA256((unsigned char *)key,length,digest);
  char *fingerprint=base64(digest,sizeof(digest)), *pub=base64((unsigned char *)key,length);
  if(!fingerprint || !pub) { free(fingerprint); free(pub); return NULL; }
  fingerprint[strcspn(fingerprint,"=")]=0;
  snprintf(result,sizeof(result),"{\"algorithm\":\"ssh-ed25519\",\"publicKey\":\"ssh-ed25519 %s\",\"fingerprintSha256\":\"SHA256:%s\"}",pub,fingerprint);
  free(fingerprint); free(pub); return result;
}
int ts_trust(const char *fingerprint) {
  if(phase!=3) return fail("INVALID_STATE");
  const char *key=ts_hostkey();
  if(!key || !fingerprint || strlen(fingerprint)<20) return fail("HOSTKEY_MISMATCH");
  char expected[128]; snprintf(expected,sizeof(expected),"\"fingerprintSha256\":\"%s\"",fingerprint);
  if(!strstr(key,expected)) return fail("HOSTKEY_MISMATCH");
  trusted=1; return 1;
}
int ts_auth(const char *encrypted_base64,char *password,const char *user,const char *tmux_name,int width,int height) {
  if(phase!=3 || !trusted) { clear_password(password); return fail("HOST_NOT_VERIFIED"); }
  if(!user || !*user || strlen(user)>63 || !strcmp(user,"root") || (!isalpha((unsigned char)*user) && *user!='_') || !tmux_name || !*tmux_name || strlen(tmux_name)>64) { clear_password(password); return fail("INVALID_PROFILE"); }
  for(const char *p=user;*p;++p) if(!isalnum((unsigned char)*p) && *p!='_' && *p!='-' && *p!='.') { clear_password(password); return fail("INVALID_PROFILE"); }
  for(const char *p=tmux_name;*p;++p) if(!isalnum((unsigned char)*p) && *p!='_' && *p!='-') { clear_password(password); return fail("INVALID_SESSION_NAME"); }
  int size; unsigned char *pem=unbase64(encrypted_base64,&size);
  if(!pem) { clear_password(password); return fail("INVALID_KEY"); }
  BIO *in=BIO_new_mem_buf(pem,size);
  EVP_PKEY *key=PEM_read_bio_PrivateKey(in,NULL,NULL,(void *)password);
  clear_password(password);
  BIO_free(in); OPENSSL_clear_free(pem,size);
  if(!key || EVP_PKEY_id(key)!=EVP_PKEY_ED25519) { EVP_PKEY_free(key); return fail("KEY_UNLOCK_FAILED"); }
  BIO *out=BIO_new(BIO_s_mem());
  if(!PEM_write_bio_PrivateKey(out,key,NULL,NULL,0,NULL,NULL)) { BIO_free(out); EVP_PKEY_free(key); return fail("KEY_UNLOCK_FAILED"); }
  char *data; long n=BIO_get_mem_data(out,&data);
  plain_key=OPENSSL_malloc(n+1); plain_key_size=n+1;
  if(!plain_key) { BIO_free(out); EVP_PKEY_free(key); return fail("OUT_OF_MEMORY"); }
  memcpy(plain_key,data,n); plain_key[n]=0; OPENSSL_cleanse(data,n);
  BIO_free(out); EVP_PKEY_free(key);
  snprintf(username,sizeof(username),"%s",user);
  snprintf(command,sizeof(command),"exec tmux new-session -A -s %s",tmux_name);
  cols=width; rows=height; phase=4; return phase;
}
int ts_tick(void) {
  int rc;
  if(phase==1) {
    struct pollfd p={sock,POLLOUT,0};
    if(poll(&p,1,0)>0) { int e=0; socklen_t n=sizeof(e); getsockopt(sock,SOL_SOCKET,SO_ERROR,&e,&n); if(e) return fail("TCP_CONNECT_FAILED"); phase=2; }
  }
  if(phase==2) { rc=libssh2_session_handshake(session,sock); if(rc==0) phase=3; else if(rc!=LIBSSH2_ERROR_EAGAIN) return fail("SSH_HANDSHAKE_FAILED"); }
  if(phase==4) {
    rc=libssh2_userauth_publickey_frommemory(session,username,strlen(username),NULL,0,plain_key,strlen(plain_key),NULL);
    if(rc==0) { clear_key(); phase=5; } else if(rc!=LIBSSH2_ERROR_EAGAIN) { clear_key(); return fail("SSH_AUTH_FAILED"); }
  }
  if(phase==5) { channel=libssh2_channel_open_session(session); if(channel) phase=6; else if(libssh2_session_last_errno(session)!=LIBSSH2_ERROR_EAGAIN) return fail("CHANNEL_FAILED"); }
  if(phase==6) { rc=libssh2_channel_request_pty_ex(channel,"xterm-256color",14,NULL,0,cols,rows,0,0); if(rc==0) {sent_cols=cols;sent_rows=rows;phase=7;} else if(rc!=LIBSSH2_ERROR_EAGAIN) return fail("PTY_FAILED"); }
  if(phase==7) { rc=libssh2_channel_exec(channel,command); if(rc==0) phase=8; else if(rc!=LIBSSH2_ERROR_EAGAIN) return fail("TMUX_START_FAILED"); }
  if(phase==8) {
    if(emscripten_get_now()-last_response>90000)return fail("SSH_TIMEOUT");
    if(resize_inflight || sent_cols!=cols || sent_rows!=rows) {
      if(!resize_inflight){resize_cols=cols;resize_rows=rows;resize_inflight=1;}
      rc=libssh2_channel_request_pty_size(channel,resize_cols,resize_rows);
      if(rc==0){sent_cols=resize_cols;sent_rows=resize_rows;resize_inflight=0;}
      else if(rc!=LIBSSH2_ERROR_EAGAIN)return fail("PTY_RESIZE_FAILED");
    }
    int seconds; rc=libssh2_keepalive_send(session,&seconds);
    if(rc && rc!=LIBSSH2_ERROR_EAGAIN) return fail("SSH_DISCONNECTED");
    if(libssh2_channel_eof(channel)) phase=9;
  }
  return phase;
}
int ts_read(unsigned char *buffer,int size) {
  if(phase!=8) return 0;
  int rc=libssh2_channel_read(channel,(char *)buffer,size);
  if(rc==LIBSSH2_ERROR_EAGAIN) return 0;
  if(rc<0) return fail("SSH_READ_FAILED");
  return rc;
}
int ts_write(const unsigned char *buffer,int size) {
  if(phase!=8) return -1;
  int rc=libssh2_channel_write(channel,(const char *)buffer,size);
  if(rc==LIBSSH2_ERROR_EAGAIN) return 0;
  if(rc<0) return fail("SSH_WRITE_FAILED");
  return rc;
}
int ts_resize(int width,int height) {
  if(width<1 || height<1 || width>1000 || height>400)return -1;
  cols=width; rows=height;
  return 0;
}
