// Copyright 2026 Piotr Adamski (piotr-adamski)
// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {newStore} from '../app/model.mjs';
const compiled=await build({entryPoints:[new URL('../app/storage.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node'});
const {loadStore,saveStore}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].contents).toString('base64'));

test('first-run NotFoundError is empty, while denied or unavailable reads remain failures',async()=>{
  globalThis.webapis={widgetdata:{read:(_ok,error)=>error({name:'NotFoundError'})}};
  assert.equal(await loadStore(),null);
  webapis.widgetdata.read=(_ok,error)=>error({name:'SecurityError'});
  await assert.rejects(loadStore(),/STORE_READ_FAILED/);
  webapis.widgetdata.read=()=>{throw new TypeError('native bridge missing')};
  await assert.rejects(loadStore(),/STORE_READ_FAILED/);
});

test('damaged persistent data is rejected without any write',async()=>{
  let writes=0;
  globalThis.webapis={widgetdata:{read:ok=>ok('{broken'),write:()=>writes++}};
  await assert.rejects(loadStore(),/STORE_INVALID/);assert.equal(writes,0);
});

test('save succeeds only after matching secure-store readback',async()=>{
  let stored='';
  globalThis.webapis={widgetdata:{read:ok=>ok(stored),write:(value,ok)=>{stored=value;ok()}}};
  const value=newStore();await saveStore(value);assert.deepEqual(await loadStore(),value);
  webapis.widgetdata.read=ok=>ok('');
  await assert.rejects(saveStore(value),/STORE_VERIFY_FAILED/);
});

test('a storage write error is surfaced, without plaintext fallback',async()=>{
  globalThis.webapis={widgetdata:{write:(_value,_ok,error)=>error({name:'QuotaExceededError'})}};
  await assert.rejects(saveStore(newStore()),/STORE_WRITE_FAILED/);
});
