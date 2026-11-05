// Copyright 2026 Piotr Adamski (piotr-adamski)
// SPDX-License-Identifier: Apache-2.0
import type {Terminal} from '@xterm/xterm';

// Samsung can deliver keypress/input after keydown already produced data,
// even after keyup. Reset for each new keydown, including hardware repeat.
export function attachTerminalKeyboard(term:Terminal,surface:HTMLElement,handler:(event:KeyboardEvent)=>boolean) {
  let translated=false;
  term.onKey(()=>{translated=true;});
  term.attachCustomKeyEventHandler(event=>{
    if(event.type==='keydown')translated=false;
    if(event.type==='keypress'&&translated){event.preventDefault();return false;}
    const pass=handler(event);
    if(event.type==='keydown'&&!pass)translated=true;
    return pass;
  });
  surface.addEventListener('compositionstart',()=>{translated=false;},true);
  surface.addEventListener('input',event=>{
    const input=event as InputEvent;
    if(translated&&input.inputType==='insertText'&&!input.isComposing){
      event.stopImmediatePropagation();term.textarea!.value='';
    }
  },true);
  return ()=>{translated=true;};
}

export type SuperAction={type:'pane',index:number}|{type:'direction',key:string}|{type:'next',reverse:boolean}|{type:'zoom'|'cycle'|'orientation'|'menu'};

export class SuperShortcuts {
  private held=false;
  private consumed=false;
  private downs=0;
  private ups=0;
  private commands=0;
  constructor(private menuCode:number|null,private action:(action:SuperAction)=>void,private blockInput:()=>void) {}
  get diagnostics(){return {menuCode:this.menuCode,held:this.held,modifierDowns:this.downs,modifierUps:this.ups,commands:this.commands};}
  reset=()=>{this.held=false;this.consumed=false;};
  handle=(event:KeyboardEvent)=>{
    const modifier=(this.menuCode!==null&&event.keyCode===this.menuCode)||[91,92,224].includes(event.keyCode)||['Meta','OS','Super','Menu'].includes(event.key);
    if(modifier){
      this.held=event.type!=='keyup';
      if(event.type==='keydown')this.downs++;else if(event.type==='keyup')this.ups++;
      this.consume(event);return;
    }
    if(event.type==='keypress'){if(this.consumed)this.consume(event);return;}
    if(event.type!=='keydown')return;
    this.consumed=false;
    if(!this.held&&!event.metaKey)return;
    this.consume(event);
    if(event.ctrlKey||event.altKey)return;
    const key=event.key.toLowerCase();let action:SuperAction|undefined;
    if(/^[1-4]$/.test(key)&&!event.shiftKey)action={type:'pane',index:Number(key)-1};
    else if(['arrowleft','arrowright','arrowup','arrowdown'].includes(key))action={type:'direction',key};
    else if(key==='tab')action={type:'next',reverse:event.shiftKey};
    else if(!event.shiftKey){
      if(key==='f')action={type:'zoom'};
      else if(key==='l')action={type:'cycle'};
      else if(key==='j')action={type:'orientation'};
      else if(key===' ')action={type:'menu'};
    }
    if(action&&(!event.repeat||['pane','direction','next'].includes(action.type))){this.commands++;this.action(action);}
  };
  private consume(event:KeyboardEvent){event.preventDefault();event.stopImmediatePropagation();this.consumed=true;this.blockInput();}
}
