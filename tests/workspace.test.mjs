// Copyright 2026 Piotr Adamski (piotr-adamski)
// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({entryPoints:[new URL('../app/workspace.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node'});
const {paneFontSize,directionalPane}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].contents).toString('base64'));

test('font preference is the focus base with owner-defined composition ratios',()=>{
  for(const base of [16,24,28,40]) {
    assert.equal(paneFontSize(base,'main',false,true),base);
    for(const [mode,ratio] of [['main',.7],['grid',.8],['columns',.5],['rows',.7]]) {
      const expected=Math.round(base*ratio*100)/100;
      assert.equal(paneFontSize(base,mode,false,false),expected);
      if(mode!=='main')assert.equal(paneFontSize(base,mode,false,true),expected);
      assert.equal(paneFontSize(base,mode,true,false),base);
    }
  }
  assert.equal(paneFontSize(24,'grid',false,true),19.2);
  assert.equal(paneFontSize(24,'main',false,false),16.8);
  assert.equal(paneFontSize(24,'columns',false,true),12);
  assert.equal(paneFontSize(24,'rows',false,true),16.8);
});

test('Super arrows select a pane in the actual layout direction',()=>{
  const grid=[{left:0,top:0,width:100,height:100},{left:110,top:0,width:100,height:100},{left:0,top:110,width:100,height:100},{left:110,top:110,width:100,height:100}];
  assert.equal(directionalPane(0,'arrowright',grid),1);
  assert.equal(directionalPane(0,'arrowdown',grid),2);
  assert.equal(directionalPane(3,'arrowup',grid),1);
  assert.equal(directionalPane(0,'arrowleft',grid),0);
  const columns=grid.map((_,i)=>({left:i*110,top:0,width:100,height:400}));
  assert.equal(directionalPane(1,'arrowright',columns),2);
  assert.equal(directionalPane(1,'arrowup',columns),1);
  const rows=grid.map((_,i)=>({left:0,top:i*110,width:400,height:100}));
  assert.equal(directionalPane(1,'arrowdown',rows),2);
  assert.equal(directionalPane(1,'arrowright',rows),1);
});
