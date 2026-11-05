// Copyright 2026 Piotr Adamski (piotr-adamski)
// SPDX-License-Identifier: Apache-2.0
import {build} from 'esbuild';
import {mkdir,copyFile,readFile,writeFile,cp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
await mkdir('dist',{recursive:true});
const pkg=JSON.parse(await readFile('package.json','utf8'));
const version={version:pkg.version,sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),builtAt:new Date().toISOString(),dependencies:pkg.dependencies,crypto:'OpenSSL 3.5.9',ssh:'libssh2 1.11.1',toolchain:'Samsung Emscripten 1.39.4.7'};
// Public builds must stay empty even when a developer has private local settings.
let target={};if(!process.argv.includes('--public')&&process.env.TIZEN_TARGET_CONFIG)target=JSON.parse(await readFile(process.env.TIZEN_TARGET_CONFIG,'utf8'));
await build({entryPoints:['app/main.ts'],bundle:true,outfile:'dist/app.js',format:'iife',target:'chrome85',minify:true,legalComments:'linked',define:{__TARGET__:JSON.stringify(target),__BUILD_INFO__:JSON.stringify(version)}});
await build({entryPoints:['app/worker.ts'],bundle:true,outfile:'dist/worker.js',format:'iife',target:'chrome85',minify:true});
for(const file of ['index.html','styles.css','config.xml']) await copyFile('app/'+file,'dist/'+file);
await copyFile('node_modules/@xterm/xterm/css/xterm.css','dist/xterm.css');
await copyFile('assets/fonts/DejaVuSansMono.ttf','dist/terminal.ttf');
await cp('LICENSES','dist/licenses',{recursive:true});
for(const name of ['LICENSE','NOTICE','AUTHORS.md','THIRD_PARTY_NOTICES.md'])await copyFile(name,'dist/'+name);
await writeFile('dist/version.json',JSON.stringify(version));
console.log('Built local UI and four-session Worker.');
