// Copyright 2026 Piotr Adamski (piotr-adamski)
// SPDX-License-Identifier: Apache-2.0
import {serializeStore, validateStore} from './model.mjs';
declare const webapis: any;
const api=()=> {
  if (typeof webapis==='undefined' || !webapis.widgetdata) throw new Error('STORE_UNAVAILABLE');
  return webapis.widgetdata;
};
export async function loadStore(): Promise<any|null> {
  const text:string|null=await new Promise((resolve,reject)=>{
    try {api().read(resolve,(error:any)=>error.name==='NotFoundError'?resolve(null):reject(new Error('STORE_READ_FAILED')));}
    catch(error:any){reject(new Error(error.message==='STORE_UNAVAILABLE'?'STORE_UNAVAILABLE':'STORE_READ_FAILED'));}
  });
  if (text===null || text==='') return null;
  try { return validateStore(JSON.parse(text)); } catch (_) { throw new Error('STORE_INVALID'); }
}
let pending=Promise.resolve();
export function saveStore(value:any):Promise<void> {
  const text=serializeStore(value);
  const operation=pending.then(async()=> {
    await new Promise<void>((resolve,reject)=>api().write(text,resolve,()=>reject(new Error('STORE_WRITE_FAILED'))));
    const stored=await loadStore();
    if (!stored || serializeStore(stored)!==text) throw new Error('STORE_VERIFY_FAILED');
  });
  pending=operation.catch(()=>{});
  return operation;
}
export async function eraseStore():Promise<void> {
  await pending;
  await new Promise<void>((resolve,reject)=>api().remove(resolve,()=>reject(new Error('STORE_REMOVE_FAILED'))));
}
