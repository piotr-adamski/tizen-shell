// Copyright 2026 Piotr Adamski (piotr-adamski)
// SPDX-License-Identifier: Apache-2.0

const DEAD_ZONE=.18;
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const axis=(value:number)=>Number.isFinite(value)?clamp(value,-1,1):0;
const pressed=(pad:Gamepad,index:number)=>!!pad.buttons[index]?.pressed;
export function pointerGamepad(pads:readonly (Gamepad|null)[]) {
  return Array.from(pads).find(p=>p?.connected&&p.axes.length>=2&&p.buttons.length>0&&(p.mapping==='standard'||/xbox|xinput|045e|microsoft/i.test(p.id)))||null;
}
function stick(x:number,y:number) {
  x=axis(x);y=axis(y);const length=Math.hypot(x,y);
  if(length<=DEAD_ZONE)return [0,0];
  const speed=Math.pow((Math.min(length,1)-DEAD_ZONE)/(1-DEAD_ZONE),1.6);
  return [x/length*speed,y/length*speed];
}

// Time-based movement stays the same at 30/60 Hz; a stalled frame cannot jump.
export class GamepadPointerState {
  x:number;y:number;
  index=-1;
  private identity='';
  private a=false;
  private menu=false;
  private b=false;
  constructor(width:number,height:number){this.x=width/2;this.y=height/2;}
  reset(){this.index=-1;this.identity='';this.a=false;this.menu=false;this.b=false;}
  update(pad:Gamepad|null,elapsed:number,width:number,height:number) {
    const result={moved:false,scroll:0,down:false,up:false,menu:false,back:false,cancelled:false,activity:false};
    if(!pad){result.cancelled=this.index!==-1;this.reset();return result;}
    const a=pressed(pad,0),menu=pressed(pad,9),b=pressed(pad,1);
    if(this.index!==pad.index||this.identity!==pad.id){
      result.cancelled=this.index!==-1;this.index=pad.index;this.identity=pad.id;this.a=a;this.menu=menu;this.b=b;
    }
    const horizontal=Number(pressed(pad,15))-Number(pressed(pad,14));
    const vertical=Number(pressed(pad,13))-Number(pressed(pad,12));
    const [vx,vy]=stick(horizontal||pad.axes[0],vertical||pad.axes[1]);
    const [,scroll]=stick(0,pad.axes[3]);
    const seconds=clamp(elapsed,0,50)/1000,scale=width/1920;
    this.x=clamp(this.x+vx*770*scale*seconds,0,width-1);
    this.y=clamp(this.y+vy*770*scale*seconds,0,height-1);
    result.moved=vx!==0||vy!==0;
    result.scroll=scroll*1100*scale*seconds;
    result.down=a&&!this.a;result.up=!a&&this.a;this.a=a;
    result.menu=menu&&!this.menu;result.back=b&&!this.b;this.menu=menu;this.b=b;
    result.activity=result.moved||result.scroll!==0||result.down||result.up||a||result.menu||result.back;
    return result;
  }
}

// This is an additional DOM pointer. Physical mouse listeners remain intact.
export class GamepadMouse {
  private state=new GamepadPointerState(window.innerWidth,window.innerHeight);
  private cursor=document.createElement('div');
  private downTarget:Element|null=null;
  private hover:Element|null=null;
  private lastFrame=0;
  private lastActivity=0;
  private suspended=false;
  private apiError=false;
  private emulatedKeys=new Set<number>();
  private lateKeypress=0;
  private clicks=0;
  private movements=0;
  private scrolls=0;
  private menuActions=0;
  private backActions=0;
  private pad:Gamepad|null=null;
  constructor(private status:HTMLElement,private openSettings:()=>void,private goBack:()=>void) {
    this.cursor.id='gamepadCursor';this.cursor.hidden=true;this.cursor.setAttribute('aria-hidden','true');
    this.cursor.innerHTML='<svg viewBox="0 0 28 34" aria-hidden="true"><path d="M3 2L3 26L9 20L14 31L19 29L14 18L24 18Z" fill="#c0caf5" stroke="#15161e" stroke-width="2.5" stroke-linejoin="round"/></svg>';
    document.body.append(this.cursor);
    window.addEventListener('mousemove',this.physicalMouse,true);
    window.addEventListener('mousedown',this.physicalMouse,true);
    window.addEventListener('blur',()=>{this.suspended=true;this.cancel();});
    window.addEventListener('focus',()=>{this.suspended=false;this.lastFrame=0;});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.cancel();this.lastFrame=0;});
    window.addEventListener('gamepaddisconnected',event=>{if(event.gamepad.index===this.state.index){this.cancel();this.pad=null;this.status.hidden=true;}});
    for(const type of ['keydown','keyup','keypress'])window.addEventListener(type,this.emulatedKey as EventListener,true);
    requestAnimationFrame(this.frame);
  }
  get diagnostics(){return {available:typeof navigator.getGamepads==='function',apiError:this.apiError,connected:!!this.pad,index:this.pad?.index??-1,id:this.pad?.id||'',mapping:this.pad?.mapping||'',axes:this.pad?.axes.length||0,buttons:this.pad?.buttons.length||0,visible:!this.cursor.hidden,x:Math.round(this.state.x),y:Math.round(this.state.y),held:!!this.downTarget,clicks:this.clicks,movements:this.movements,scrolls:this.scrolls,menuActions:this.menuActions,backActions:this.backActions};}
  private readPad() {
    if(typeof navigator.getGamepads!=='function'||this.apiError)return null;
    try{return pointerGamepad(navigator.getGamepads());}
    catch(_){this.apiError=true;return null;}
  }
  private cancel() {
    if(this.downTarget)this.mouse('mouseup',this.downTarget,0);
    this.downTarget=null;this.state.reset();this.emulatedKeys.clear();this.lateKeypress=0;this.hide();
  }
  private hide(){this.cursor.hidden=true;this.hover?.classList.remove('gamepad-hover');this.hover=null;}
  private physicalMouse=(event:MouseEvent)=>{
    if(!event.isTrusted)return;
    this.cancel();this.state.x=event.clientX;this.state.y=event.clientY;
  };
  // Samsung may also translate the same pad input into Enter/arrow keys.
  // Correlate with a fresh physical pad sample; ordinary keyboard keys pass.
  private emulatedKey=(event:KeyboardEvent)=>{
    const pad=this.readPad();
    const arrow=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key);
    const padKey=pad&&((event.keyCode===13&&pressed(pad,0))||([10133,93,121].includes(event.keyCode)&&pressed(pad,9))||([10009,27].includes(event.keyCode)&&pressed(pad,1))||(arrow&&(pad.axes.slice(0,2).some(v=>Math.abs(v)>DEAD_ZONE)||[12,13,14,15].some(i=>pressed(pad,i)))));
    if(event.type==='keydown'&&!padKey&&!this.emulatedKeys.has(event.keyCode)){this.lateKeypress=0;return;}
    if(!padKey&&!this.emulatedKeys.has(event.keyCode)&&!(event.type==='keypress'&&this.lateKeypress===event.keyCode))return;
    event.preventDefault();event.stopImmediatePropagation();
    if(event.type==='keyup')this.emulatedKeys.delete(event.keyCode);
    else if(event.type==='keydown'){this.emulatedKeys.add(event.keyCode);this.lateKeypress=event.keyCode;}
  };
  private target() {
    const hit=document.elementFromPoint(this.state.x,this.state.y);
    if(!hit)return null;
    const dialogs=document.querySelectorAll<HTMLDialogElement>('dialog[open]');
    const modal=dialogs[dialogs.length-1];
    if(modal&&!modal.contains(hit))return null;
    return hit.closest('button,input,label,a')||hit;
  }
  private mouse(type:string,target:Element,buttons:number) {
    return target.dispatchEvent(new MouseEvent(type,{view:window,bubbles:true,cancelable:true,composed:true,clientX:this.state.x,clientY:this.state.y,button:0,buttons,detail:type==='mousemove'?0:1}));
  }
  private render() {
    // A modal is in the browser's top layer. Put the cursor there too.
    const dialogs=document.querySelectorAll<HTMLDialogElement>('dialog[open]');
    const parent=dialogs[dialogs.length-1]||document.body;
    if(this.cursor.parentElement!==parent){
      parent.append(this.cursor);
      this.cursor.style.setProperty('zoom',String(1/(Number(getComputedStyle(parent).getPropertyValue('zoom'))||1)));
    }
    this.cursor.style.left=this.state.x+'px';this.cursor.style.top=this.state.y+'px';this.cursor.hidden=false;
    const target=this.target(),hover=target?.closest('button,input')||null;
    if(hover!==this.hover){this.hover?.classList.remove('gamepad-hover');hover?.classList.add('gamepad-hover');this.hover=hover;}
  }
  private scroll(target:Element,delta:number) {
    const event=new WheelEvent('wheel',{bubbles:true,cancelable:true,clientX:this.state.x,clientY:this.state.y,deltaY:delta,deltaMode:0});
    if(!target.dispatchEvent(event))return; // xterm handles its own scroll/mouse reporting.
    for(let node:Element|null=target;node;node=node.parentElement){
      const overflow=getComputedStyle(node).overflowY;
      if(node.scrollHeight>node.clientHeight+1&&['auto','scroll'].includes(overflow)){
        const before=node.scrollTop;node.scrollTop+=delta;
        if(node.scrollTop!==before)return;
      }
    }
  }
  private frame=(now:number)=>{
    const elapsed=this.lastFrame?now-this.lastFrame:0;this.lastFrame=now;
    if(!document.hidden&&!this.suspended){
      const pad=this.readPad();this.pad=pad;
      this.status.hidden=!pad;
      const update=this.state.update(pad,elapsed,window.innerWidth,window.innerHeight);
      if(update.cancelled){if(this.downTarget)this.mouse('mouseup',this.downTarget,0);this.downTarget=null;this.hide();}
      if(update.menu||update.back){
        if(this.downTarget)this.mouse('mouseup',this.downTarget,0);this.downTarget=null;
        if(update.back){this.goBack();this.backActions++;}else{this.openSettings();this.menuActions++;}
        this.lastActivity=now;this.render();
      }else if(update.activity){
        this.lastActivity=now;this.render();const target=this.target();
        if(update.moved){this.movements++;if(target)this.mouse('mousemove',target,this.downTarget?1:0);}
        if(update.down&&target){
          this.downTarget=target;
          if(this.mouse('mousedown',target,1)&&target instanceof HTMLElement&&target.matches('button,input,a[href]'))target.focus({preventScroll:true});
        }
        if(update.up&&this.downTarget){
          const down=this.downTarget;this.downTarget=null;
          if(target)this.mouse('mouseup',target,0);else this.mouse('mouseup',down,0);
          if(target===down&&target.isConnected&&!target.matches(':disabled')){this.mouse('click',target,0);this.clicks++;}
        }
        if(update.scroll&&target){this.scroll(target,update.scroll);this.scrolls++;}
      }else if(!pad||now-this.lastActivity>5000)this.hide();
    }
    requestAnimationFrame(this.frame);
  };
}
