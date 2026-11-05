// Copyright 2026 Piotr Adamski (piotr-adamski)
// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newStore,validateStore,verifyHost,serializeStore,InputQueue} from '../app/model.mjs';
const fingerprint='SHA256:'+'A'.repeat(43);
const target={host:'example.invalid',port:22,fingerprintSha256:fingerprint};
const host={algorithm:'ssh-ed25519',publicKey:'ssh-ed25519 AAAA',fingerprintSha256:fingerprint};
test('four independent slots have durable tmux names and configurable non-root identity',()=>{
  const store=validateStore(newStore(target));assert.equal(store.panes.length,4);assert.equal(new Set(store.panes.map(p=>p.tmuxSession)).size,4);assert.equal(store.profile.username,'tvuser');
});
test('publication defaults are neutral and SSH account is explicitly configurable',()=>{
  const defaults=validateStore(newStore());assert.equal(defaults.profile.host,'');assert.equal(defaults.profile.label,'');assert.equal(defaults.expectedFingerprint,'');
  const configured=validateStore(newStore({...target,username:'shell_user-2'}));assert.equal(configured.profile.username,'shell_user-2');
  for(const username of ['root','','x;id','user@server','user name','-option','x'.repeat(64)]){configured.profile.username=username;assert.throws(()=>validateStore(configured),/INVALID_TARGET/);}
});
test('first contact needs independent fingerprint; substitution and endpoint change are rejected',()=>{
  const store=newStore(target);assert.deepEqual(verifyHost(store,host),{...host,host:target.host,port:22});
  assert.throws(()=>verifyHost(newStore(),host),/HOSTKEY/);
  store.hostTrust=verifyHost(store,host);
  assert.throws(()=>verifyHost(store,{...host,publicKey:'ssh-ed25519 BBBB'}),/HOSTKEY/);
  store.profile.port=2222;assert.throws(()=>verifyHost(store,host),/HOSTKEY/);
});
test('encrypted identities must be distinct and tmux names cannot inject commands',()=>{
  const store=newStore(target);store.panes[0].tmuxSession='x; id';assert.throws(()=>validateStore(store),/SESSION/);
  store.panes[0].tmuxSession='safe';const key={algorithm:'ssh-ed25519',publicKey:'ssh-ed25519 AAAA',encryptedPrivateKey:'AAAA',keyFormatVersion:1};
  store.panes[0].identity=key;store.panes[1].identity={...key};assert.throws(()=>validateStore(store),/INVALID_KEY/);
});
test('unknown schema and over-limit store do not become empty profiles',()=>{
  const store=newStore(target);store.schemaVersion=2;assert.throws(()=>validateStore(store),/SCHEMA/);
  store.schemaVersion=1;store.profile.label='x'.repeat(18000);assert.throws(()=>serializeStore(store),/TOO_LARGE/);
});
test('bounded input queue preserves partial writes and refuses overflow',()=>{
  const q=new InputQueue();q.push(new Uint8Array([1,2,3]));q.consume(2);assert.deepEqual([...q.head()],[3]);
  q.push(new Uint8Array(65535));assert.throws(()=>q.push(new Uint8Array([4])),/OVERFLOW/);q.consume(1);assert.equal(q.size,65535);
});
