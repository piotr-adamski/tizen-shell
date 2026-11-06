// Copyright 2026 Piotr Adamski (piotr-adamski)
// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({entryPoints:[new URL('../app/gamepad.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node'});
const {GamepadPointerState,pointerGamepad}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].contents).toString('base64'));
const pad=(axes=[0,0,0,0],a=false,extra={})=>({index:0,id:'Xbox Wireless Controller',mapping:'standard',connected:true,axes,buttons:Array.from({length:17},(_,i)=>({pressed:i===0&&a,value:i===0&&a?1:0})),...extra});
test('Xbox/standard pad selection handles gaps and disconnects without requiring a mouse',()=>{
  const xbox=pad();assert.equal(pointerGamepad([null,xbox]),xbox);
  assert.equal(pointerGamepad([pad(undefined,false,{connected:false})]),null);
  assert.ok(pointerGamepad([pad(undefined,false,{mapping:''})]));
  assert.equal(pointerGamepad([pad(undefined,false,{mapping:'',id:'Unknown device'})]),null);
});
test('stick drift stays still, fine motion accelerates, diagonal and frame rate stay bounded',()=>{
  const s=new GamepadPointerState(1920,1080);
  assert.equal(s.update(pad([.1,-.1,0,.1]),16,1920,1080).activity,false);
  assert.deepEqual([s.x,s.y],[960,540]);
  s.update(pad([.3,0,0,0]),16,1920,1080);const fine=s.x-960;
  s.update(pad([1,0,0,0]),16,1920,1080);assert.ok(s.x-960-fine>fine*4);
  const run=(steps,ms)=>{const p=new GamepadPointerState(1920,1080);for(let i=0;i<steps;i++)p.update(pad([.5,0,0,0]),ms,1920,1080);return p.x;};
  assert.ok(Math.abs(run(60,1000/60)-run(30,1000/30))<.001);
  const d=new GamepadPointerState(1920,1080);d.update(pad([1,1,0,0]),1000,1920,1080);assert.ok(Math.abs(Math.hypot(d.x-960,d.y-540)-38.5)<.001);
  const slow=new GamepadPointerState(1920,1080);for(let i=0;i<60;i++)slow.update(pad([1,0,0,0]),1000/60,1920,1080);assert.ok(Math.abs(slow.x-960-770)<.001);
  for(let i=0;i<200;i++)d.update(pad([1,1,0,0]),50,1920,1080);assert.deepEqual([d.x,d.y],[1919,1079]);
});
test('A has one down/up per physical press, hotplug and held resume never click',()=>{
  const s=new GamepadPointerState(1920,1080);
  assert.equal(s.update(pad(undefined,true),16,1920,1080).down,false);
  s.update(pad(),16,1920,1080);
  assert.equal(s.update(pad(undefined,true),16,1920,1080).down,true);
  assert.equal(s.update(pad(undefined,true),16,1920,1080).down,false);
  assert.equal(s.update(pad(),16,1920,1080).up,true);
  assert.equal(s.update(pad(),16,1920,1080).up,false);
  s.update(pad(undefined,true),16,1920,1080);
  assert.equal(s.update(null,16,1920,1080).cancelled,true);
  assert.equal(s.update(pad(undefined,true),16,1920,1080).down,false);
  s.reset();assert.equal(s.update(pad(undefined,true),16,1920,1080).down,false);
});
test('right stick scroll and D-pad motion are independent of A',()=>{
  const s=new GamepadPointerState(1920,1080),p=pad([0,0,0,1]);
  const frame=s.update(p,16,1920,1080);assert.ok(frame.scroll>0);assert.equal(frame.down,false);assert.equal(frame.moved,false);
  p.axes=[0,0,0,-1];assert.ok(s.update(p,16,1920,1080).scroll<0);
  p.axes=[0,0,0,0];p.buttons[15].pressed=true;assert.ok(s.update(p,16,1920,1080).moved);assert.ok(s.x>960);
});
test('Menu and B trigger once, held buttons on connect or resume do not act',()=>{
  const state=new GamepadPointerState(1920,1080),p=pad();state.update(p,16,1920,1080);
  p.buttons[9].pressed=true;assert.equal(state.update(p,16,1920,1080).menu,true);
  assert.equal(state.update(p,16,1920,1080).menu,false);
  p.buttons[9].pressed=false;state.update(p,16,1920,1080);
  p.buttons[1].pressed=true;assert.equal(state.update(p,16,1920,1080).back,true);
  assert.equal(state.update(p,16,1920,1080).back,false);
  p.buttons[9].pressed=true;state.reset();const resumed=state.update(p,16,1920,1080);assert.equal(resumed.menu,false);assert.equal(resumed.back,false);
});
