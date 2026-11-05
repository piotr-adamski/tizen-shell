// Copyright 2026 Piotr Adamski (piotr-adamski)
// SPDX-License-Identifier: Apache-2.0
import {execFileSync} from 'node:child_process';
import {readFile,lstat} from 'node:fs/promises';
const git=(args,input)=>execFileSync('git',args,{encoding:'utf8',input,maxBuffer:16*1024*1024}).trim();
const files=git(['ls-files','-z']).split('\0').filter(Boolean),failures=[];
const forbidden=/(^|\/)(?:\.cache|\.toolchain|node_modules|dist|build|\.secrets|\.tizen)(?:\/|$)|^docs\/(?:dowody|zrodla)\/|\.(?:wgt|p12|pfx|pem|key|ppk|crt|cer)$/i;
const rules=[
 ['private-key-material',/-----BEGIN (?:ENCRYPTED |RSA |EC |OPENSSH )?PRIVATE KEY-----[\r\n]+[A-Za-z0-9+/=]{30}/],
 ['literal-public-ssh-key',/ssh-ed25519 [A-Za-z0-9+/]{40,}={0,2}/],
 ['literal-host-fingerprint',/SHA256:[A-Za-z0-9+/]{43}(?![A-Za-z0-9+/])/],
 ['private-ip-address',/(?<![\d.])(?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(?![\d.])/],
 ['personal-home-path',/\/(?:home|Users)\/[A-Za-z0-9_.-]+\//],
 ['credential-token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[A-Z0-9]{16})\b/]
];
let privateValues=[];
if(process.env.PUBLICATION_PRIVATE_VALUES_FILE)privateValues=JSON.parse(await readFile(process.env.PUBLICATION_PRIVATE_VALUES_FILE,'utf8')).filter(s=>typeof s==='string'&&s.length>=4);
for(const file of files){
 if(forbidden.test(file)||/(^|\/)(?:profiles\.xml|\.env(?:\..*)?)$/.test(file))failures.push({path:file,rule:'forbidden-path'});
 if((await lstat(file)).isSymbolicLink())failures.push({path:file,rule:'symlink-not-allowed'});
}
const blobs=new Map();
for(const line of git(['rev-list','--objects','--all']).split('\n')){
 const id=line.split(' ')[0];if(git(['cat-file','-t',id])!=='blob')continue;
 blobs.set(id,line.slice(id.length+1));
}
for(const [id,path] of blobs){
 const body=execFileSync('git',['cat-file','blob',id],{maxBuffer:16*1024*1024}).toString('utf8');
 for(const [name,pattern] of rules)if(pattern.test(body))failures.push({path,blob:id.slice(0,12),rule:name});
 if(privateValues.some(value=>body.includes(value)))failures.push({path,blob:id.slice(0,12),rule:'operator-private-value'});
}
for(const file of ['LICENSE','NOTICE','AUTHORS.md','THIRD_PARTY_NOTICES.md','SECURITY.md','README.md','README.pl.md','docs/third-party-components.json'])if(!files.includes(file))failures.push({path:file,rule:'required-file-missing'});
const components=JSON.parse(await readFile('docs/third-party-components.json','utf8')).components;
for(const component of components)for(const key of ['licenseFile','authorsFile'])if(!files.includes(component[key]))failures.push({path:component[key],rule:'component-notice-missing'});
console.log(JSON.stringify({ok:failures.length===0,trackedFiles:files.length,historyCommits:Number(git(['rev-list','--all','--count'])),scannedHistoryBlobs:blobs.size,privateValueCheck:!!process.env.PUBLICATION_PRIVATE_VALUES_FILE,failures},null,2));
if(failures.length)process.exitCode=1;
