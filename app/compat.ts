// Copyright 2026 Piotr Adamski (piotr-adamski)
// SPDX-License-Identifier: Apache-2.0
// xterm's DOM renderer calls replaceChildren, absent in Chromium 85.
// Keep the fallback local instead of downloading runtime polyfills.
export function installDomCompatibility() {
  if(typeof Element.prototype.replaceChildren!=='function') {
    Object.defineProperty(Element.prototype,'replaceChildren',{
      configurable:true,writable:true,
      value:function(this:Element,...nodes:(Node|string)[]) {
        const fragment=this.ownerDocument.createDocumentFragment();
        nodes.forEach(node=>fragment.appendChild(typeof node==='string'?this.ownerDocument.createTextNode(node):node));
        while(this.firstChild)this.removeChild(this.firstChild);
        this.appendChild(fragment);
      }
    });
  }
}
