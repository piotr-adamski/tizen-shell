// Copyright 2026 Piotr Adamski (piotr-adamski)
// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({entryPoints:[new URL('../app/keyboard.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node'});
const {SuperShortcuts}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].contents).toString('base64'));
function key(type,key,keyCode=0,extra={}){
 return {type,key,keyCode,ctrlKey:false,altKey:false,shiftKey:false,metaKey:false,repeat:false,prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...extra};
}
test('Samsung Menu acts as a held modifier and releases without trapping normal typing',()=>{
 const actions=[];let blocked=0;const shortcut=new SuperShortcuts(10133,a=>actions.push(a),()=>blocked++);
 const down=key('keydown','Menu',10133);shortcut.handle(down);assert.ok(down.prevented&&down.stopped);
 shortcut.handle(key('keydown','2',50));shortcut.handle(key('keyup','Menu',10133));
 assert.deepEqual(actions,[{type:'pane',index:1}]);assert.equal(shortcut.diagnostics.held,false);
 const late=key('keypress','2',50);shortcut.handle(late);assert.equal(late.stopped,true);
 const ordinary=key('keydown','a',65);shortcut.handle(ordinary);assert.equal(ordinary.stopped,false);
 const ordinaryPress=key('keypress','a',97);shortcut.handle(ordinaryPress);assert.equal(ordinaryPress.stopped,false);assert.ok(blocked>=3);
});
test('native Meta chords route navigation, direction, orientation, layout and menu once',()=>{
 const actions=[];const shortcut=new SuperShortcuts(null,a=>actions.push(a),()=>{});
 for(const [name,extra] of [['ArrowRight',{}],['Tab',{shiftKey:true}],['f',{}],['f',{repeat:true}],['j',{}],['l',{}],[' ',{}]])shortcut.handle(key('keydown',name,0,{metaKey:true,...extra}));
 assert.deepEqual(actions,[{type:'direction',key:'arrowright'},{type:'next',reverse:true},{type:'zoom'},{type:'orientation'},{type:'cycle'},{type:'menu'}]);
 const unknown=key('keydown','x',88,{metaKey:true});shortcut.handle(unknown);assert.equal(unknown.stopped,true);assert.equal(actions.length,6);
 shortcut.handle(key('keydown','Meta',91));shortcut.reset();
 const afterBlur=key('keydown','1',49);shortcut.handle(afterBlur);assert.equal(afterBlur.stopped,false);
});
