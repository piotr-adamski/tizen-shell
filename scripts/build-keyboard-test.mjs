// Copyright 2026 Piotr Adamski (piotr-adamski)
// SPDX-License-Identifier: Apache-2.0
import {build} from 'esbuild';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
await mkdir('.cache/keyboard-browser',{recursive:true});
await build({entryPoints:['tests/keyboard-browser.ts'],bundle:true,outfile:'.cache/keyboard-browser/test.js',target:'chrome85',format:'iife'});
await copyFile('node_modules/@xterm/xterm/css/xterm.css','.cache/keyboard-browser/xterm.css');
await writeFile('.cache/keyboard-browser/index.html','<!doctype html><html lang="pl"><meta charset="utf-8"><link rel="stylesheet" href="xterm.css"><title>Regresja wejścia terminala</title><body><button id="run">Sprawdź wejście terminala</button><pre id="results"></pre><div id="fixtures"></div><script src="test.js"></script></body></html>');
console.log('Built .cache/keyboard-browser; serve this directory on loopback to run the real xterm event regression.');
