// Copyright 2026 Piotr Adamski (piotr-adamski)
// SPDX-License-Identifier: Apache-2.0
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {basename} from 'node:path';
const file=process.argv[2];if(!file)throw new Error('PACKAGE_FILE_REQUIRED');
const bytes=await readFile(file),version=JSON.parse(await readFile('dist/version.json','utf8'));
const manifest={...version,file:basename(file),sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
await writeFile('build/release.json',JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest));
