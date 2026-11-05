// Copyright 2026 Piotr Adamski (piotr-adamski)
// SPDX-License-Identifier: Apache-2.0
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
globalThis.self=globalThis;
const filename=path.resolve('dist/native/core.js');
const loaded=new Module(filename,module);loaded.filename=filename;loaded.paths=Module._nodeModulePaths(path.dirname(filename));
loaded._compile(fs.readFileSync(filename,'utf8'),filename);
let finished=false;
loaded.exports({wasmBinary:fs.readFileSync('dist/native/core.wasm'),print:()=>{},printErr:()=>{},onRuntimeInitialized:function(){
  try {
    const m=this, call=(name,result,args,values)=>m.ccall(name,result,args,values);
    assert.equal(call('ts_init','number',[],[]),1);
    assert.equal(call('ts_rng_test','number',['number'],[0]),1);
    assert.equal(call('ts_rng_test','number',['number'],[1]),0);
    const keys=[];
    if(!process.argv.includes('--rng-only')) {
    for(let i=0;i<4;i++) {
      const password=crypto.randomBytes(32).toString('base64url');
      const identity=JSON.parse(call('ts_generate','string',['string'],[password]));
      const pem=Buffer.from(identity.encryptedPrivateKey,'base64');
      assert.ok(pem.toString().startsWith('-----BEGIN ENCRYPTED PRIVATE KEY-----'));
      const key=crypto.createPrivateKey({key:pem,passphrase:password});
      const publicJwk=crypto.createPublicKey(key).export({format:'jwk'});
      const blob=Buffer.from(identity.publicKey.split(' ')[1],'base64');
      assert.equal(blob.length,51);assert.equal(blob.readUInt32BE(0),11);assert.equal(blob.subarray(4,15).toString(),'ssh-ed25519');
      assert.deepEqual(blob.subarray(19),Buffer.from(publicJwk.x,'base64url'));
      assert.throws(()=>crypto.createPrivateKey({key:pem,passphrase:'incorrect-test-passphrase'}));
      keys.push(identity.publicKey);pem.fill(0);
    }
    assert.equal(new Set(keys).size,4);
    }
    const original=Object.getOwnPropertyDescriptor(globalThis,'crypto');
    Object.defineProperty(globalThis,'crypto',{configurable:true,value:{getRandomValues(){throw new Error('synthetic entropy failure');}}});
    try {assert.ok(!call('ts_generate','string',['string'],['synthetic-test-passphrase']));}finally{if(original)Object.defineProperty(globalThis,'crypto',original);}
    console.log(JSON.stringify({nativeCrypto:'verified',scope:process.argv.includes('--rng-only')?'entropy-failure':'full',differentEd25519Keys:keys.length,rngUnavailableGenerationRejected:true,heapBytes:m.HEAPU8.byteLength}));
    finished=true;
  } catch(error) {console.error('Native crypto acceptance failed:',error.code||error.name,(error.stack||'').split('\n').filter(line=>line.includes('native-crypto.cjs:')).join('\n'));process.exitCode=1;finished=true;}
}});
setTimeout(()=>{if(!finished){console.error('Native crypto initialization timed out');process.exitCode=1;}},30000).unref();
