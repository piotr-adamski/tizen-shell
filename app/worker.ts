// Copyright 2026 Piotr Adamski (piotr-adamski)
// SPDX-License-Identifier: Apache-2.0
import {InputQueue} from './model.mjs';
declare const self: any;
declare function importScripts(...urls:string[]):void;
// Samsung 1.39.4.7 socket host bindings read this flag without pthreads too.
// Every pane runs in an ordinary Worker, never an Emscripten pthread.
self.ENVIRONMENT_IS_PTHREAD=false;
let core:any, functions:any, interval:any, stage=0, stageAt=0, outstanding=0;
let readPtr=0, inputPtr=0, queue=new InputQueue();
const post=(type:string,data:any={})=>self.postMessage({type,...data});
const loading=(async()=> {
  importScripts('native/core.js');
  await new Promise<void>((resolve,reject)=>{
    self.ShellCore({locateFile:(name:string)=>'native/'+name,print:()=>{},printErr:()=>{},onRuntimeInitialized:function(this:any){core=this;resolve();},onAbort:()=>reject(new Error('WASM_INIT_FAILED'))});
  });
  functions={};
  const wraps:any={init:['number',[]],generate:['string',['string']],rng_test:['number',['number']],connect:['number',['string','number']],tick:['number',[]],hostkey:['string',[]],trust:['number',['string']],auth:['number',['string','string','string','string','number','number']],resize:['number',['number','number']],error:['string',[]],close:[null,[]]};
  for (const [name,args] of Object.entries(wraps) as any) functions[name]=core.cwrap('ts_'+name,args[0],args[1]);
  if(functions.init()!==1) throw new Error('RNG_UNAVAILABLE');
  readPtr=core._malloc(16384); inputPtr=core._malloc(65536);
  post('ready',{rng:!!functions.rng_test(0),rngFailsClosed:!functions.rng_test(1)});
})();
function stop(code?:string) {
  clearInterval(interval); interval=null;
  if(functions) functions.close();
  queue=new InputQueue(); outstanding=0;
  if(code) post('error',{code}); else post('closed');
}
function tick() {
  try {
    const next=functions.tick();
    if(next<0) return stop(functions.error()||'SSH_FAILED');
    if(next!==stage) {
      stage=next; stageAt=performance.now(); post('state',{stage});
      if(next===3) post('hostKey',{hostKey:JSON.parse(functions.hostkey())});
    }
    const elapsed=performance.now()-stageAt;
    if((stage===1 && elapsed>15000) || (stage===2 && elapsed>30000) || (stage>=4 && stage<=7 && elapsed>30000)) return stop('SSH_TIMEOUT');
    if(stage===9) return stop();
    if(stage!==8) return;
    const input=queue.head();
    if(input) {
      core.HEAPU8.set(input,inputPtr); const n=core._ts_write(inputPtr,input.length);
      if(n<0) return stop(functions.error());
      if(n) queue.consume(n);
    }
    if(outstanding<131072) {
      const n=core._ts_read(readPtr,16384);
      if(n<0) return stop(functions.error());
      if(n) { const bytes=core.HEAPU8.slice(readPtr,readPtr+n); outstanding+=n; self.postMessage({type:'output',bytes},[bytes.buffer]); }
    }
  } catch (_) { stop('SSH_RUNTIME_FAILED'); }
}
self.onmessage=async(event:any)=> {
  const {type,id,...data}=event.data;
  try {
    await loading;
    switch(type) {
      case 'generate': {
        const result=functions.generate(data.password); data.password='';
        if(!result) throw new Error(functions.error()||'KEY_GENERATION_FAILED');
        return post('result',{id,value:JSON.parse(result)});
      }
      case 'connect':
        stage=functions.connect(data.host,data.port); stageAt=performance.now();
        if(stage<0) throw new Error(functions.error());
        post('state',{stage}); interval=setInterval(tick,12); break;
      case 'verifyHost':
        if(functions.trust(data.fingerprint)!==1) throw new Error('HOSTKEY_MISMATCH');
        return post('result',{id,value:true});
      case 'unlockKey':
        if(functions.auth(data.key,data.password,data.username,data.tmuxSession,data.cols,data.rows)<0) throw new Error(functions.error());
        data.password=''; data.key=''; break;
      case 'input':queue.push(data.bytes);break;
      case 'ack':outstanding=Math.max(0,outstanding-data.count);break;
      case 'resize':functions.resize(data.cols,data.rows);break;
      case 'disconnect':stop();break;
    }
  } catch(error:any) { post('error',{id,code:error.message||'SSH_FAILED'}); if(type!=='generate') stop(); }
};
