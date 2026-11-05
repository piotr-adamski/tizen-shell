// Copyright 2026 Piotr Adamski (piotr-adamski)
// SPDX-License-Identifier: Apache-2.0
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';

// Loopback-only visual preview. WidgetData is replaced in the HTTP response,
// never in dist/ or the signed TV package. No TV or SSH command is issued.
const root=resolve('dist');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.ttf':'font/ttf','.json':'application/json','.txt':'text/plain'};
const platform=`if(location.pathname==='/legacy')delete Element.prototype.replaceChildren;
var previewStore='';var webapis={widgetdata:{read(ok){ok(previewStore)},write(value,ok){previewStore=value;ok()},remove(ok){previewStore='';ok()}}};
document.addEventListener('DOMContentLoaded',()=>{document.title='tizen-shell · local preview';const note=document.createElement('span');note.textContent='LOCAL PREVIEW · no SSH';note.style.color='#e0af68';document.querySelector('footer').prepend(note)});`;
const server=createServer(async(req,res)=>{
  try {
    const pathname=new URL(req.url,'http://127.0.0.1').pathname;
    res.setHeader('Cache-Control','no-store');
    if(pathname==='/preview-platform.js'){res.setHeader('Content-Type','text/javascript');res.end(platform);return;}
    const file=resolve(root,pathname==='/'||pathname==='/legacy'?'index.html':'.'+decodeURIComponent(pathname));
    if(!file.startsWith(root+sep))throw new Error('OUTSIDE_PREVIEW');
    let content=await readFile(file);
    if(file.endsWith('/index.html'))content=Buffer.from(content.toString().replace('$WEBAPIS/webapis/webapis.js','/preview-platform.js').replace(' $WEBAPIS;',';'));
    res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(content);
  }catch(_){res.writeHead(404);res.end('Not found');}
});
server.listen(4173,'127.0.0.1',()=>console.log('Visual preview: http://127.0.0.1:4173/ (no TV actions)'));
