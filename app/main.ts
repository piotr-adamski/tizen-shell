// Copyright 2026 Piotr Adamski (piotr-adamski)
// SPDX-License-Identifier: Apache-2.0
import {Terminal} from '@xterm/xterm';
import {FitAddon} from '@xterm/addon-fit';
import {newStore,validateStore,verifyHost} from './model.mjs';
import {loadStore,saveStore,eraseStore} from './storage';
import {Workspace,Composition,paneFontSize,directionalPane} from './workspace';
import {installDomCompatibility} from './compat';
import {attachTerminalKeyboard,SuperShortcuts} from './keyboard';
declare const tizen:any;
declare const __TARGET__:any;
declare const __BUILD_INFO__:any;
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const input=(id:string)=>$<HTMLInputElement>(id);
const dialog=(id:string)=>$<HTMLDialogElement>(id);
const labels:any={0:'Rozłączono',1:'Łączenie TCP',2:'Negocjacja SSH',3:'Weryfikacja hosta',4:'Uwierzytelnianie',5:'Kanał SSH',6:'Terminal PTY',7:'Dołączanie tmux',8:'Połączono',9:'Rozłączono'};
const errors:any={STORE_UNAVAILABLE:'Brak bezpiecznego magazynu WidgetData na tym TV.',STORE_READ_FAILED:'Nie udało się odczytać magazynu. Dane nie zostały nadpisane.',STORE_INVALID:'Magazyn jest uszkodzony lub pochodzi z innej wersji. Dane nie zostały nadpisane.',STORE_WRITE_FAILED:'TV odmówił zapisu danych.',STORE_VERIFY_FAILED:'Odczyt nie potwierdził zapisu. Sprawdź dane po ponownym uruchomieniu.',STORE_TOO_LARGE:'Dane przekraczają limit magazynu.',HOSTKEY_MISMATCH:'Klucz serwera nie zgadza się z zaufanym odciskiem. Połączenie zablokowano.',INVALID_TARGET:'Sprawdź adres hosta, port i nazwę użytkownika SSH (bez konta root).',INVALID_FINGERPRINT:'Wprowadź poprawny odcisk SHA256 klucza hosta.',INVALID_SESSION_NAME:'Nazwa tmux: 1–64 liter, cyfr, znaków _ lub -.',KEY_UNLOCK_FAILED:'Nie można odblokować klucza. Sprawdź hasło ochronne.',SSH_AUTH_FAILED:'Serwer odrzucił klucz. Sprawdź wpis w authorized_keys.',SSH_TIMEOUT:'Serwer nie odpowiedział w wymaganym czasie.',RNG_UNAVAILABLE:'Brak bezpiecznego źródła losowości. Operacja przerwana.',INPUT_OVERFLOW:'Za dużo oczekujących danych wejściowych. Sesja została zatrzymana.',SSH_HANDSHAKE_FAILED:'Negocjacja SSH nie powiodła się. Sprawdź algorytmy i dostęp do serwera.',TCP_CONNECT_FAILED:'Nie można połączyć się z serwerem. Sprawdź adres, port i sieć.',DNS_FAILED:'Nie udało się rozwiązać nazwy serwera.',TMUX_START_FAILED:'Nie udało się uruchomić tmux na serwerze.'};
errors.DISCONNECT_BEFORE_EDIT='Rozłącz panele przed zmianą serwera, odcisku lub nazw sesji. Font i margines możesz zmieniać podczas pracy.';
function human(code:string) {return errors[code]||`Błąd operacji (${code}).`;}
let store:any,storageFault=false,active=0,prefix=false,prefixTimer:any,unlockQueue:number[][]=[],unlockBusy=false,dialogPanes:number[]=[];
let unlockBatch:{pending:Set<number>,verified:Set<number>}|null=null;
let bootPhase='BOOT_COMPAT',bootError='';
const workspace=new Workspace($('panes'),fitAll);
const encoder=new TextEncoder();
let nextRequest=1;
let trustSaving:Promise<void>|null=null,controlModifier=false;
type Pane={index:number,section:HTMLElement,term:Terminal,fit:FitAddon,worker:Worker|null,stage:number,epoch:number,requests:Map<number,any>,ready:Promise<void>|null,rng:boolean,hostKey:any,lastError:string,blockKeyboard:()=>void};
const panes:Pane[]=[];
let superShortcuts:SuperShortcuts|undefined,superMenuRegistered=false;
const closingWorkers=new Set<Worker>();
function showNotice(title:string,text:string) {$('noticeTitle').textContent=title;$('noticeText').textContent=text;dialog('notice').showModal();}
function summary(text:string,error=false) {$('summary').textContent=text;$('summary').classList.toggle('error',error);}
function busy() {return panes.some(p=>p.worker!==null);}
function renderState(p:Pane) {
  const state=p.section.querySelector('.state')!;state.textContent=p.lastError?human(p.lastError):labels[p.stage];
  p.section.querySelector<HTMLButtonElement>('.connect')!.textContent=p.worker?'Rozłącz':'Połącz';
  p.section.dataset.stage=String(p.stage);p.section.dataset.error=String(!!p.lastError);
  p.section.querySelector<HTMLElement>('.pane-empty')!.hidden=!!p.worker;
  document.querySelector<HTMLElement>(`[data-pane="${p.index}"]`)!.dataset.connected=String(p.stage===8);
  $('target').textContent=`${store.profile.username}@${store.profile.label||store.profile.host||'SSH'}`;
  summary(`${panes.filter(p=>p.stage===8).length}/4 połączone${prefix?' · prefiks Ctrl+B':''}`);
}
function focusPane(index:number) {
  active=(index+4)%4;
  workspace.render(active);if(!document.querySelector('dialog[open]'))panes[active].term.focus();
}
function toggleZoom(index=active) {
  const restore=workspace.zoomed&&active===index;
  active=index;workspace.zoomed=!restore;workspace.render(active);
  if(!document.querySelector('dialog[open]'))panes[active].term.focus();
}
function fitAll() {
  for(const p of panes) {
    if(p.section.offsetWidth>0 && p.section.offsetHeight>0) {
      const size=paneFontSize(store.preferences.fontSize,workspace.composition,workspace.zoomed,p.index===active);
      if(p.term.options.fontSize!==size)p.term.options.fontSize=size;
      p.section.dataset.fontSize=String(size);
      p.fit.fit();if(p.worker)p.worker.postMessage({type:'resize',cols:p.term.cols,rows:p.term.rows});
    }
  }
}
function send(p:Pane,type:string,data:any={}) {p.worker?.postMessage({type,...data});}
function request(p:Pane,type:string,data:any={}) {
  return new Promise<any>((resolve,reject)=>{const id=nextRequest++;p.requests.set(id,{resolve,reject});send(p,type,{id,...data});});
}
function disconnect(index:number) {
  const p=panes[index];p.epoch++;
  const old=p.worker;
  if(old) {
    closingWorkers.add(old);let deadline:any;
    const finish=()=>{clearTimeout(deadline);old.terminate();closingWorkers.delete(old);};
    old.onmessage=event=>{if(event.data.type==='closed')finish();};old.onerror=finish;
    old.postMessage({type:'disconnect'});deadline=setTimeout(finish,1000);
  }
  p.worker=null;p.ready=null;p.stage=0;p.hostKey=null;
  for(const pending of p.requests.values())pending.reject(new Error('CANCELLED'));p.requests.clear();
  p.term.clear();p.term.reset();renderState(p);
  unlockQueue=unlockQueue.map(ids=>ids.filter(i=>i!==index)).filter(ids=>ids.length);
  if(dialogPanes.includes(index)) {
    dialogPanes=dialogPanes.filter(i=>i!==index);
    if(!dialogPanes.length){input('pass').value='';dialog('unlock').close();unlockBusy=false;promptNext();}
  }
  finishUnlockAttempt(index,false);
}
function disconnectAll() {unlockBatch=null;unlockQueue=[];panes.forEach((_,i)=>disconnect(i));}
function finishUnlockAttempt(index:number,verified:boolean) {
  if(!verified)unlockBatch?.verified.delete(index);
  if(unlockBatch?.pending.has(index)){
    unlockBatch.pending.delete(index);if(verified)unlockBatch.verified.add(index);
    if(!unlockBatch.pending.size){const ids=[...unlockBatch.verified].filter(i=>!!panes[i].worker);unlockBatch=null;if(ids.length)unlockQueue.push(ids);promptNext();}
  }else if(verified){unlockQueue.push([index]);promptNext();}
}
function connectAll() {
  if(unlockBatch)return;
  const ids=panes.filter(p=>!p.worker).map(p=>p.index);
  if(!ids.length)return;
  unlockBatch={pending:new Set(ids),verified:new Set()};
  ids.forEach(i=>connect(i));
}
async function createWorker(p:Pane) {
  if(p.worker) return p.ready;
  const epoch=++p.epoch;p.worker=new Worker('worker.js');p.lastError='';
  p.ready=new Promise<void>((resolve,reject)=> {
    p.worker!.onerror=()=>{reject(new Error('WORKER_FAILED'));p.lastError='WORKER_FAILED';disconnect(p.index);renderState(p);};
    p.worker!.onmessage=async(event)=> {
      if(epoch!==p.epoch) return;
      const message=event.data;
      if(message.type==='ready') {p.rng=message.rng&&message.rngFailsClosed; if(p.rng)resolve();else reject(new Error('RNG_UNAVAILABLE'));}
      if(message.type==='result') {p.requests.get(message.id)?.resolve(message.value);p.requests.delete(message.id);}
      if(message.type==='output') {const bytes=message.bytes;p.term.write(bytes,()=>{if(epoch===p.epoch)send(p,'ack',{count:bytes.length});});}
      if(message.type==='state') {p.stage=message.stage;renderState(p);}
      if(message.type==='closed')disconnect(p.index);
      if(message.type==='error') {
        p.requests.get(message.id)?.reject(new Error(message.code));p.requests.delete(message.id);
        reject(new Error(message.code));p.lastError=message.code;disconnect(p.index);renderState(p);
      }
      if(message.type==='hostKey') {
        try {
          const trust=verifyHost(store,message.hostKey);
          if(!store.hostTrust && !trustSaving) {
            const yes=confirm(`Klucz hosta ${store.profile.host}:${store.profile.port} jest zgodny z niezależnie podanym odciskiem.\nOdcisk pozostaje zamaskowany; możesz go odsłonić w ustawieniach.\n\nZapisać i zaufać temu kluczowi?`);
            if(!yes)return disconnect(p.index);
            const next={...store,hostTrust:trust};
            trustSaving=saveStore(next).then(()=>{store=next;});
          }
          if(trustSaving){try{await trustSaving;}finally{trustSaving=null;}}
          if(epoch!==p.epoch)return;
          await request(p,'verifyHost',{fingerprint:store.expectedFingerprint});
          p.hostKey=trust;finishUnlockAttempt(p.index,true);
        } catch(error:any) {p.lastError=error.message;disconnect(p.index);renderState(p);}
      }
    };
  });
  return p.ready;
}
async function connect(index:number) {
  const p=panes[index];if(p.worker)return;
  try {
    if(storageFault)throw new Error('STORE_READ_FAILED');validateStore(store);
    if(!store.profile.host || !store.expectedFingerprint || !store.panes[index].identity) {finishUnlockAttempt(index,false);openSettings();return;}
    await createWorker(p);send(p,'connect',{host:store.profile.host,port:store.profile.port});
  }catch(error:any){p.lastError=error.message;disconnect(index);renderState(p);}
}
function promptNext() {
  if(unlockBusy || !unlockQueue.length)return;
  const ids=unlockQueue.shift()!.filter(i=>!!panes[i].worker);if(!ids.length)return promptNext();
  unlockBusy=true;dialogPanes=ids;
  $('unlockTitle').textContent=ids.length>1?`Odblokuj ${ids.length} panele`:`Panel ${ids[0]+1} · ${store.panes[ids[0]].tmuxSession}`;
  $('unlockError').textContent='';input('pass').value='';dialog('unlock').showModal();input('pass').focus();
}
function renderKeys() {
  const container=$('publicKeys');container.textContent='';
  store.panes.forEach((pane:any)=>{
    const label=document.createElement('p');label.textContent=`Panel ${pane.id} · ${pane.tmuxSession}`;container.append(label);
    const code=document.createElement('pre');code.id=`public-key-${pane.id}`;code.textContent=pane.identity?'••••••••••••••••••••••••••••••••':'Klucz jeszcze nieutworzony';container.append(code);
    if(pane.identity){
      const reveal=document.createElement('button');reveal.type='button';reveal.className='reveal-key';reveal.textContent='Pokaż klucz';reveal.setAttribute('aria-controls',code.id);reveal.setAttribute('aria-pressed','false');
      reveal.onclick=()=>{const show=reveal.getAttribute('aria-pressed')!=='true';code.textContent=show?`${pane.identity.publicKey} tizen-shell-pane-${pane.id}`:'••••••••••••••••••••••••••••••••';reveal.textContent=show?'Ukryj klucz':'Pokaż klucz';reveal.setAttribute('aria-pressed',String(show));};
      container.append(reveal);
    }
  });
  $('keyStatus').textContent=`${store.panes.filter((p:any)=>p.identity).length}/4 klucze zapisane`;
}
function openSettings() {
  input('host').value=store.profile.host;input('port').value=String(store.profile.port);input('username').value=store.profile.username;input('fingerprint').value=store.expectedFingerprint;
  input('fontSize').value=String(store.preferences.fontSize);input('safeMargin').value=String(store.preferences.safeMargin);
  showFingerprint(false);
  store.panes.forEach((p:any,i:number)=>input('tmux'+i).value=p.tmuxSession);
  renderKeys();$('settingsError').textContent=storageFault?'Magazyn nie został odczytany. Jawny reset jest potrzebny przed nowym zapisem.':'';
  if(!dialog('settings').open)dialog('settings').showModal();
}
function showFingerprint(show:boolean) {
  input('fingerprint').type=show?'text':'password';
  $('showFingerprint').textContent=show?'Ukryj odcisk':'Pokaż odcisk';
  $('showFingerprint').setAttribute('aria-pressed',String(show));
}
function applyPreferences() {
  panes.forEach((p,i)=>{p.section.querySelector('.pane-name')!.textContent=store.panes[i].tmuxSession;p.section.querySelector('.empty-name')!.textContent=store.panes[i].tmuxSession;});
  document.documentElement.style.setProperty('--safe-margin',`${store.preferences.safeMargin}%`);fitAll();
}
function setPrefix(value:boolean){prefix=value;clearTimeout(prefixTimer);$('prefix').textContent=value?'Prefiks…':'Ctrl+B';$('prefix').dataset.active=String(value);if(value)prefixTimer=setTimeout(()=>setPrefix(false),5000);}
function keyHandler(p:Pane,event:KeyboardEvent) {
  if(event.type!=='keydown')return true;
  if(event.ctrlKey && !event.altKey && event.key.toLowerCase()==='b') {
    event.preventDefault();if(prefix){setPrefix(false);send(p,'input',{bytes:new Uint8Array([2])});}else setPrefix(true);return false;
  }
  if(prefix) {
    event.preventDefault();setPrefix(false);const key=event.key.toLowerCase();
    if(/^[1-4]$/.test(key))focusPane(Number(key)-1);
    else if(['o','n','arrowright'].includes(key))focusPane(active+1);
    else if(['p','arrowleft'].includes(key))focusPane(active-1);
    else if(key==='arrowup'||key==='arrowdown')focusPane(active+2);
    else if(key==='z')toggleZoom();
    else if(key===' ')workspace.cycle(active);
    else if(key==='d')disconnect(active);
    return false;
  }
  return true;
}
function initPanes() {
  for(let i=0;i<4;i++) {
    const section=document.createElement('section');section.className='pane';section.dataset.stage='0';section.setAttribute('aria-label',`Panel ${i+1}`);
    const head=document.createElement('div');head.className='pane-head';
    const number=document.createElement('span');number.className='pane-number';number.textContent=String(i+1).padStart(2,'0');
    const titleBox=document.createElement('div');titleBox.className='pane-title';
    const title=document.createElement('span');title.className='pane-name';title.textContent=store.panes[i].tmuxSession;
    const state=document.createElement('span');state.className='state';state.textContent=labels[0];
    const button=document.createElement('button');button.className='connect';button.textContent='Połącz';button.onclick=()=>panes[i].worker?disconnect(i):connect(i);
    const expand=document.createElement('button');expand.className='expand';expand.textContent='Powiększ';expand.onclick=()=>toggleZoom(i);
    titleBox.append(title,state);head.append(number,titleBox,button,expand);
    const content=document.createElement('div');content.className='pane-content';
    const surface=document.createElement('div');surface.className='terminal';
    const empty=document.createElement('div');empty.className='pane-empty';
    const emptyLabel=document.createElement('span');emptyLabel.className='empty-label';emptyLabel.textContent=`SESJA ${String(i+1).padStart(2,'0')}`;
    const emptyName=document.createElement('strong');emptyName.className='empty-name';emptyName.textContent=store.panes[i].tmuxSession;
    const hint=document.createElement('span');hint.className='empty-hint';hint.textContent='Połącz się, aby wrócić do swojej powłoki na serwerze.';
    const shortcut=document.createElement('span');shortcut.className='empty-key';shortcut.textContent=`Ctrl+B → ${i+1}`;
    empty.append(emptyLabel,emptyName,hint,shortcut);content.append(surface,empty);section.append(head,content);$('panes').append(section);
    const term=new Terminal({fontFamily:'Terminal, monospace',fontSize:store.preferences.fontSize,scrollback:2000,convertEol:false,allowProposedApi:false,allowTransparency:false,theme:{background:'#1a1b26',foreground:'#c0caf5',cursor:'#7aa2f7',selectionBackground:'#33467c',black:'#15161e',red:'#f7768e',green:'#9ece6a',yellow:'#e0af68',blue:'#7aa2f7',magenta:'#bb9af7',cyan:'#7dcfff',white:'#a9b1d6',brightBlack:'#737aa2',brightRed:'#ff9eaa',brightGreen:'#b9e08a',brightYellow:'#f0c68a',brightBlue:'#a0bcff',brightMagenta:'#d0b1ff',brightCyan:'#a4e4ff',brightWhite:'#c0caf5'}});
    const fit=new FitAddon();term.loadAddon(fit);term.open(surface);
    // Keep physical keyboard input in xterm without asking for a soft keyboard.
    term.textarea!.inputMode='none';
    const pane:Pane={index:i,section,term,fit,worker:null,stage:0,epoch:0,requests:new Map(),ready:null,rng:false,hostKey:null,lastError:'',blockKeyboard:()=>{}};panes.push(pane);
    pane.blockKeyboard=attachTerminalKeyboard(term,surface,e=>keyHandler(pane,e));term.onData(data=>{
      if(controlModifier && data.length===1){data=String.fromCharCode(data.toUpperCase().charCodeAt(0)&31);controlModifier=false;const b=document.querySelector('[data-ctrl]');if(b){b.textContent='Ctrl';b.setAttribute('aria-pressed','false');}}
      if(pane.stage===8)send(pane,'input',{bytes:encoder.encode(data)});
    });
    // Legacy X10 mouse reports contain raw bytes, not UTF-8 text.
    term.onBinary(data=>{if(pane.stage===8)send(pane,'input',{bytes:Uint8Array.from(data,c=>c.charCodeAt(0)&255)});});
    term.parser.registerOscHandler(52,()=>true);term.parser.registerOscHandler(8,()=>true);term.parser.registerOscHandler(0,()=>true);term.parser.registerOscHandler(2,()=>true);
    section.addEventListener('mousedown',event=>{
      if(active!==i)focusPane(i);
      if(!(event.target as Element).closest('button'))term.focus();
    });
  }
  focusPane(0);
}
async function boot() {
  installDomCompatibility();bootPhase='BOOT_STORAGE';
  const target=__TARGET__;
  try {store=await loadStore()||newStore(target);} catch(error:any) {store=newStore(target);storageFault=true;summary(human(error.message),true);}
  bootPhase='BOOT_TERMINALS';initPanes();applyPreferences();bootPhase='BOOT_CONTROLS';
  const version=__BUILD_INFO__;$('version').textContent=`v${version.version} · ${version.sha.slice(0,7)}`;
  const fields=$('sessionFields');for(let i=0;i<4;i++){const label=document.createElement('label');label.textContent=`Sesja tmux panelu ${i+1}`;const field=document.createElement('input');field.id='tmux'+i;field.maxLength=64;label.append(field);fields.append(label);}
  $('menu').onclick=openSettings;
  $('showFingerprint').onclick=()=>showFingerprint(input('fingerprint').type==='password');
  dialog('settings').addEventListener('close',()=>{showFingerprint(false);renderKeys();});
  document.querySelectorAll<HTMLButtonElement>('button[data-pane]').forEach(b=>b.onclick=()=>focusPane(Number(b.dataset.pane)));
  document.querySelectorAll<HTMLButtonElement>('button[data-layout]').forEach(b=>b.onclick=()=>workspace.select(b.dataset.layout as Composition,active));
  $('toggleZoom').onclick=()=>toggleZoom();
  $('closeSettings').onclick=()=>{dialog('settings').close();focusPane(active);};
  $('connectAll').onclick=connectAll;
  $('disconnectAll').onclick=()=>disconnectAll();
  $('noticeOk').onclick=()=>dialog('notice').close();
  $('profileForm').onsubmit=async(event)=> {
    event.preventDefault();$('settingsError').textContent='';
    try {
      if(storageFault)throw new Error('STORE_READ_FAILED');
      if(trustSaving)await trustSaving;
      const next=JSON.parse(JSON.stringify(store));next.profile.host=input('host').value.trim();next.profile.port=Number(input('port').value);next.profile.username=input('username').value.trim();next.expectedFingerprint=input('fingerprint').value.trim();
      if(next.profile.host!==store.profile.host || next.profile.port!==store.profile.port || next.expectedFingerprint!==store.expectedFingerprint)next.hostTrust=null;
      next.panes.forEach((p:any,i:number)=>p.tmuxSession=input('tmux'+i).value.trim());next.preferences.fontSize=Number(input('fontSize').value);next.preferences.safeMargin=Number(input('safeMargin').value);
      const targetChanged=next.profile.host!==store.profile.host||next.profile.port!==store.profile.port||next.profile.username!==store.profile.username||next.expectedFingerprint!==store.expectedFingerprint||next.panes.some((p:any,i:number)=>p.tmuxSession!==store.panes[i].tmuxSession);
      if(busy()&&targetChanged)throw new Error('DISCONNECT_BEFORE_EDIT');
      validateStore(next);await saveStore(next);store=next;applyPreferences();$('settingsError').textContent='Zapisano.';
    }catch(error:any){$('settingsError').textContent=human(error.message);}
  };
  $('generate').onclick=async()=> {
    const button=$<HTMLButtonElement>('generate');$('settingsError').textContent='';
    try {
      if(busy())throw new Error('DISCONNECT_BEFORE_EDIT');if(storageFault)throw new Error('STORE_READ_FAILED');
      if(!input('newPass').value)throw new Error('INVALID_PASSPHRASE');
      if(store.panes.some((p:any)=>p.identity) && !confirm('Zastąpić cztery klucze? Stare wpisy na serwerze trzeba odwołać osobno.'))return;
      button.disabled=true;const next=JSON.parse(JSON.stringify(store));
      for(let i=0;i<4;i++) {
        $('keyStatus').textContent=`Generowanie i ochrona klucza ${i+1}/4…`;
        await createWorker(panes[i]);next.panes[i].identity=await request(panes[i],'generate',{password:input('newPass').value});disconnect(i);
      }
      await saveStore(next);store=next;renderKeys();
    }catch(error:any){$('settingsError').textContent=human(error.message);}finally{input('newPass').value='';button.disabled=false;}
  };
  $('unlockForm').onsubmit=event=> {
    event.preventDefault();const ids=dialogPanes.slice();if(!ids.length)return;
    const password=input('pass').value;input('pass').value='';dialogPanes=[];
    for(const i of ids){const p=panes[i];send(p,'unlockKey',{key:store.panes[i].identity.encryptedPrivateKey,password,username:store.profile.username,tmuxSession:store.panes[i].tmuxSession,cols:p.term.cols,rows:p.term.rows});}
    dialog('unlock').close();unlockBusy=false;promptNext();focusPane(ids.includes(active)?active:ids[0]);
  };
  const cancelUnlock=()=>dialogPanes.slice().forEach(i=>disconnect(i));
  $('cancelUnlock').onclick=cancelUnlock;
  dialog('unlock').addEventListener('cancel',event=>{event.preventDefault();cancelUnlock();});
  $('exit').onclick=()=>{
    if(busy() && !confirm('Rozłączyć cztery panele i zakończyć aplikację? Sesje tmux i powłoki pozostaną na serwerze.'))return;
    disconnectAll();
    setTimeout(()=>{if(typeof tizen!=='undefined')tizen.application.getCurrentApplication().exit();},1100);
  };
  $('reset').onclick=async()=> {
    if(!confirm('Usunąć profil, przypięcie hosta i wszystkie klucze z TV? Dostęp na serwerze trzeba odwołać oddzielnie.'))return;
    try {disconnectAll();await eraseStore();store=newStore(target);await saveStore(store);storageFault=false;applyPreferences();openSettings();}catch(error:any){$('settingsError').textContent=human(error.message);}
  };
  let menuCode:number|null=null;
  try {
    if(typeof tizen!=='undefined'){
      const menu=tizen.tvinputdevice.getKey('Menu');
      if(menu){tizen.tvinputdevice.registerKey(menu.name);menuCode=menu.code;superMenuRegistered=true;}
    }
  }catch(_){/* Browser Meta events still work when TV Menu registration is unavailable. */}
  superShortcuts=new SuperShortcuts(menuCode,action=>{
    setPrefix(false);
    if(action.type==='menu'){
      if(dialog('settings').open){dialog('settings').close();focusPane(active);}
      else if(!document.querySelector('dialog[open]'))openSettings();
      return;
    }
    if(document.querySelector('dialog[open]'))return;
    if(action.type==='pane')focusPane(action.index);
    else if(action.type==='next')focusPane(active+(action.reverse?-1:1));
    else if(action.type==='direction'){
      const index=workspace.zoomed?((active+(['arrowleft','arrowup'].includes(action.key)?3:1))%4):directionalPane(active,action.key,panes.map(p=>({left:p.section.offsetLeft,top:p.section.offsetTop,width:p.section.offsetWidth,height:p.section.offsetHeight})));
      focusPane(index);
    }
    else if(action.type==='zoom')toggleZoom();
    else if(action.type==='cycle')workspace.cycle(active);
    else if(action.type==='orientation')workspace.select(workspace.composition==='rows'?'columns':'rows',active);
  },()=>panes.forEach(p=>p.blockKeyboard()));
  for(const type of ['keydown','keyup','keypress'])window.addEventListener(type,superShortcuts.handle as EventListener,true);
  window.addEventListener('blur',superShortcuts.reset);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)superShortcuts?.reset();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){disconnectAll();input('pass').value='';input('newPass').value='';showFingerprint(false);renderKeys();dialog('unlock').close();}});
  window.addEventListener('pagehide',disconnectAll);
  window.addEventListener('resize',fitAll);
  document.addEventListener('keydown',event=>{
    if(event.keyCode===10009) {
      event.preventDefault();
      if(dialog('unlock').open){dialogPanes.slice().forEach(i=>disconnect(i));return;}
      if(dialog('settings').open){dialog('settings').close();focusPane(active);return;}
      openSettings();
    }
    const opened=document.querySelector<HTMLDialogElement>('dialog[open]');
    if(!opened && document.activeElement instanceof HTMLButtonElement && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)) {
      const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')).filter(b=>b.offsetParent!==null);
      const index=buttons.indexOf(document.activeElement);
      if(index>=0){event.preventDefault();buttons[(index+(['ArrowUp','ArrowLeft'].includes(event.key)?-1:1)+buttons.length)%buttons.length].focus();}
      return;
    }
    if(opened && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)) {
      const current=document.activeElement as HTMLElement;
      if(current instanceof HTMLInputElement && ['ArrowLeft','ArrowRight'].includes(event.key))return;
      const focusable=Array.from(opened.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)')).filter(e=>e.offsetParent!==null);
      const index=focusable.indexOf(current);
      if(index>=0){event.preventDefault();const next=(index+(['ArrowUp','ArrowLeft'].includes(event.key)?-1:1)+focusable.length)%focusable.length;focusable[next].focus();}
    }
  });
  const controls=$('controls');
  for(const [label,value] of [['Esc','\x1b'],['Tab','\t'],['Ctrl',''],['↑','\x1b[A'],['↓','\x1b[B'],['←','\x1b[D'],['→','\x1b[C']]) {
    const button=document.createElement('button');button.textContent=label;if(label==='Ctrl')button.dataset.ctrl='true';
    button.onclick=()=>{
      if(label==='Ctrl'){controlModifier=!controlModifier;button.textContent=controlModifier?'Ctrl aktywny':'Ctrl';button.setAttribute('aria-pressed',String(controlModifier));return;}
      if(panes[active].stage===8)send(panes[active],'input',{bytes:encoder.encode(value)});
    };controls.append(button);
  }
  try {if(typeof tizen!=='undefined')tizen.tvinputdevice.registerKeyBatch(['ColorF0Red','ColorF1Green','ColorF2Yellow','ColorF3Blue']);}catch(_){summary('Pilot: użyj strzałek i OK.');}
  bootPhase='BOOT_SETTINGS';
  if(storageFault || !store.panes.every((p:any)=>p.identity))openSettings();else summary('Rozłączono · wybierz panel lub Połącz 4');
  bootPhase='READY';if(!storageFault)summary('0/4 połączone');
  document.fonts?.ready.then(()=>fitAll());
}
Object.defineProperty(window,'shellDiagnostics',{get:()=>({bootPhase,bootError,apis:{wasm:typeof WebAssembly!=='undefined',rng:!!window.crypto?.getRandomValues,replaceChildren:typeof Element.prototype.replaceChildren==='function'},panes:panes.map(p=>({id:p.index+1,stage:p.stage,rng:p.rng,worker:!!p.worker,error:p.lastError})),closingWorkers:closingWorkers.size,activePane:active+1,composition:workspace.composition,zoomed:workspace.zoomed,version:__BUILD_INFO__.version,sha:__BUILD_INFO__.sha,storageFault,superKey:{registered:superMenuRegistered,...superShortcuts?.diagnostics}})});
boot().catch(error=>{bootError=['TypeError','ReferenceError','SecurityError','NotSupportedError'].includes(error?.name)?error.name:'UnknownError';summary(`Nie udało się uruchomić aplikacji. Kod: ${bootPhase}/${bootError}.`,true);});
