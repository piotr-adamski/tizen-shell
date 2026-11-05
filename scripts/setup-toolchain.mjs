// Copyright 2026 Piotr Adamski (piotr-adamski)
// SPDX-License-Identifier: Apache-2.0
import {readFile,mkdir,stat} from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';
import {execFileSync} from 'node:child_process';
const manifest=JSON.parse(await readFile('docs/toolchain-sources.json','utf8'));
await mkdir('.toolchain',{recursive:true});
async function exists(path){try{await stat(path);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
for(const source of manifest.sources) {
  const archive='.toolchain/'+source.archive;
  if(!await exists(archive)) {
    const response=await fetch(source.url);
    if(!response.ok)throw new Error(`Source download failed: ${source.archive}, HTTP ${response.status}`);
    await pipeline(Readable.fromWeb(response.body),createWriteStream(archive));
  }
  const hash=createHash('sha256');for await(const chunk of createReadStream(archive))hash.update(chunk);
  if(hash.digest('hex')!==source.sha256)throw new Error('Source checksum mismatch: '+source.archive);
  if(!await exists('.toolchain/'+source.directory)) {
    if(source.archive.endsWith('.zip'))execFileSync('unzip',['-q',archive,'-d','.toolchain']);
    else execFileSync('tar',['xf',archive,'-C','.toolchain']);
  }
  console.log('Source ready: '+source.archive);
}
