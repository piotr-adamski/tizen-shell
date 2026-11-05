// Copyright 2026 Piotr Adamski (piotr-adamski)
// SPDX-License-Identifier: Apache-2.0
import {Terminal} from '@xterm/xterm';
import {attachTerminalKeyboard,SuperShortcuts} from '../app/keyboard';

const press=(area:HTMLTextAreaElement,key:string,keyCode:number,ctrlKey=false,repeat=false)=>{
  area.dispatchEvent(new KeyboardEvent('keydown',{key,keyCode,which:keyCode,ctrlKey,repeat,bubbles:true,cancelable:true}));
  area.dispatchEvent(new KeyboardEvent('keypress',{key,keyCode:ctrlKey?keyCode-64:key.charCodeAt(0),charCode:ctrlKey?keyCode-64:key.charCodeAt(0),ctrlKey,bubbles:true,cancelable:true}));
  area.dispatchEvent(new KeyboardEvent('keyup',{key,keyCode,ctrlKey,bubbles:true,cancelable:true}));
  if(!ctrlKey){area.value+=key;area.dispatchEvent(new InputEvent('input',{data:key,inputType:'insertText',bubbles:true,composed:true}));}
};

function replay(fixed:boolean,run:(area:HTMLTextAreaElement)=>void,shortcut=false) {
  const surface=document.createElement('div');surface.style.cssText='width:600px;height:160px';document.getElementById('fixtures')!.append(surface);
  const term=new Terminal({cols:40,rows:4});term.open(surface);let output='',prefix=false;
  term.onData(data=>{output+=data;});
  const handler=(e:KeyboardEvent)=>{if(!shortcut||e.type!=='keydown')return true;if(e.ctrlKey&&e.key==='b'){prefix=true;e.preventDefault();return false;}if(prefix){prefix=false;e.preventDefault();return false;}return true;};
  if(fixed)attachTerminalKeyboard(term,surface,handler);else term.attachCustomKeyEventHandler(handler);
  term.focus();run(term.textarea!);term.dispose();surface.remove();return output;
}

function replaySuper(menu:boolean) {
  const outputs=['',''],surfaces:HTMLElement[]=[],terms:Terminal[]=[],gates:(()=>void)[]=[];let actions=0;
  for(let i=0;i<2;i++){
    const surface=document.createElement('div');surface.style.cssText='width:600px;height:160px';document.getElementById('fixtures')!.append(surface);surfaces.push(surface);
    const term=new Terminal({cols:40,rows:4});term.open(surface);term.onData(data=>{outputs[i]+=data;});terms.push(term);gates.push(attachTerminalKeyboard(term,surface,()=>true));
  }
  const controller=new SuperShortcuts(menu?10133:null,action=>{if(action.type==='pane'){actions++;terms[action.index].focus();}},()=>gates.forEach(block=>block()));
  for(const type of ['keydown','keyup','keypress'])window.addEventListener(type,controller.handle as EventListener,true);
  terms[0].focus();const first=terms[0].textarea!,second=terms[1].textarea!;
  first.dispatchEvent(new KeyboardEvent('keydown',{key:menu?'Menu':'Meta',keyCode:menu?10133:91,bubbles:true,cancelable:true}));
  first.dispatchEvent(new KeyboardEvent('keydown',{key:'2',keyCode:50,metaKey:!menu,bubbles:true,cancelable:true}));
  second.dispatchEvent(new KeyboardEvent('keypress',{key:'2',keyCode:50,charCode:50,bubbles:true,cancelable:true}));
  second.dispatchEvent(new KeyboardEvent('keyup',{key:menu?'Menu':'Meta',keyCode:menu?10133:91,bubbles:true,cancelable:true}));
  second.value='2';second.dispatchEvent(new InputEvent('input',{data:'2',inputType:'insertText',bubbles:true,composed:true}));
  const noShortcutLeak=outputs.every(value=>value==='');press(second,'a',65);
  const pass=noShortcutLeak&&outputs[0]===''&&outputs[1]==='a'&&actions===1&&!controller.diagnostics.held;
  for(const type of ['keydown','keyup','keypress'])window.removeEventListener(type,controller.handle as EventListener,true);
  terms.forEach(term=>term.dispose());surfaces.forEach(surface=>surface.remove());
  return {name:menu?'Samsung Menu+2 changes focus without leaked late text':'Native Super+2 changes focus without leaked late text',pass,actions,outputLengths:outputs.map(value=>value.length)};
}

document.getElementById('run')!.onclick=()=>{
  const cases=[
    {name:'Single lower-case stroke with late input',run:(a:HTMLTextAreaElement)=>press(a,'a',65),expected:'a'},
    {name:'Intentionally repeated letters',run:(a:HTMLTextAreaElement)=>{press(a,'a',65);press(a,'a',65);},expected:'aa'},
    {name:'Hardware auto-repeat is retained',run:(a:HTMLTextAreaElement)=>{press(a,'a',65);press(a,'a',65,false,true);press(a,'a',65,false,true);},expected:'aaa'},
    {name:'Upper case keypress path is retained',run:(a:HTMLTextAreaElement)=>press(a,'A',65),expected:'A'},
    {name:'Ctrl+C is emitted once',run:(a:HTMLTextAreaElement)=>press(a,'c',67,true),expected:'\x03'},
    {name:'Ctrl+B Space stays local',run:(a:HTMLTextAreaElement)=>{press(a,'b',66,true);press(a,' ',32);},expected:'',shortcut:true},
    {name:'Text input without a keyboard event is retained',run:(a:HTMLTextAreaElement)=>a.dispatchEvent(new InputEvent('input',{data:'ą',inputType:'insertText',bubbles:true,composed:true})),expected:'ą'}
  ];
  const result=cases.map(c=>{const baseline=replay(false,c.run,c.shortcut),actual=replay(true,c.run,c.shortcut);return{name:c.name,pass:actual===c.expected,baselineLength:baseline.length,actualLength:actual.length,expectedLength:c.expected.length};});
  result.push(...[replaySuper(true),replaySuper(false)] as any);
  const output=document.getElementById('results')!;output.textContent=JSON.stringify(result,null,2);output.dataset.result=result.every(r=>r.pass)?'pass':'fail';
};
