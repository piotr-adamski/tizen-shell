// Copyright 2026 Piotr Adamski (piotr-adamski)
// SPDX-License-Identifier: Apache-2.0
export const compositions = [
  {id:'grid', label:'Siatka', detail:'2 × 2'},
  {id:'main', label:'Fokus', detail:'1 + 3'},
  {id:'columns', label:'Kolumny', detail:'4 × 1'},
  {id:'rows', label:'Wiersze', detail:'1 × 4'}
] as const;
export type Composition = typeof compositions[number]['id'];

export function paneFontSize(base:number,composition:Composition,zoomed:boolean,active:boolean) {
  const ratio=zoomed||(composition==='main'&&active)?1:({grid:.8,main:.7,columns:.5,rows:.7})[composition];
  return Math.round(base*ratio*100)/100;
}

export function directionalPane(active:number,key:string,rects:{left:number,top:number,width:number,height:number}[]) {
  const origin=rects[active],horizontal=key==='arrowleft'||key==='arrowright',sign=key==='arrowleft'||key==='arrowup'?-1:1;
  const center=(r:typeof origin)=>[r.left+r.width/2,r.top+r.height/2];
  const [x,y]=center(origin);let selected=active,best=Infinity;
  rects.forEach((rect,i)=>{
    if(i===active||!rect.width||!rect.height)return;
    const [cx,cy]=center(rect),along=(horizontal?cx-x:cy-y)*sign,across=Math.abs(horizontal?cy-y:cx-x);
    const score=along+across*2;
    if(along>1&&score<best){best=score;selected=i;}
  });return selected;
}

// Move existing terminal surfaces without replacing terminals or Workers.
export class Workspace {
  composition:Composition='grid';
  zoomed=false;
  private animations:Animation[]=[];
  constructor(private root:HTMLElement, private resize:()=>void) {}
  render(active:number,animate=true) {
    const panes=Array.from(this.root.querySelectorAll<HTMLElement>('.pane'));
    const before=panes.map(p=>p.getBoundingClientRect());
    this.animations.forEach(a=>a.cancel());this.animations=[];
    this.root.dataset.layout=this.composition;
    this.root.classList.toggle('zoom',this.zoomed);
    panes.forEach((pane,i)=>pane.classList.toggle('active',i===active));
    document.querySelectorAll<HTMLButtonElement>('button[data-pane]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.pane)===active)));
    document.querySelectorAll<HTMLButtonElement>('button[data-layout]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layout===this.composition&&!this.zoomed)));
    const toggle=document.getElementById('toggleZoom');
    toggle?.setAttribute('aria-pressed',String(this.zoomed));
    if(toggle)toggle.textContent=this.zoomed?'Przywróć układ':'Powiększ';
    const caption=document.getElementById('layoutCaption');
    if(caption)caption.textContent=this.zoomed?`Panel ${active+1} / 4`:compositions.find(c=>c.id===this.composition)!.detail;
    panes.forEach((pane,i)=>{
      const button=pane.querySelector<HTMLButtonElement>('.expand');
      if(button){button.textContent=this.zoomed&&i===active?'Przywróć':'Powiększ';button.setAttribute('aria-label',`${button.textContent} panel ${i+1}`);}
    });
    this.resize();
    if(!animate||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    panes.forEach((pane,i)=>{
      const after=pane.getBoundingClientRect(),old=before[i];
      if(!after.width||!after.height||typeof pane.animate!=='function')return;
      const from=old.width&&old.height?{transform:`translate(${old.left-after.left}px,${old.top-after.top}px) scale(${old.width/after.width},${old.height/after.height})`}:{transform:'scale(.98)',opacity:0};
      this.animations.push(pane.animate([from,{transform:'none',opacity:1}],{duration:190,easing:'cubic-bezier(.2,.75,.25,1)'}));
    });
  }
  select(composition:Composition,active:number) {this.composition=composition;this.zoomed=false;this.render(active);}
  cycle(active:number) {this.select(compositions[(compositions.findIndex(c=>c.id===this.composition)+1)%compositions.length].id,active);}
}
