#!/usr/bin/env bash
# Copyright 2026 Piotr Adamski (piotr-adamski)
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail
task_root="$(cd -- "$(dirname -- "$0")/.." && pwd)"
sdk="$task_root/.toolchain/emscripten-release-bundle/emsdk"
export PATH="$sdk/fastcomp/emscripten:$sdk/fastcomp/bin:$PATH"
export EM_CONFIG="$task_root/.cache/emscripten-config"
export EM_CACHE="$task_root/.cache/emscripten-cache"
mkdir -p "$task_root/.cache" "$task_root/build/native" "$task_root/dist/native"
if [[ ! -f "$EM_CONFIG" ]]; then
  cp "$sdk/fastcomp/emscripten_config_fastcomp" "$EM_CONFIG"
  python3 - "$EM_CONFIG" "$sdk" <<'PY'
import sys
from pathlib import Path
p=Path(sys.argv[1]); sdk=sys.argv[2]
p.write_text(f"LLVM_ROOT = '{sdk}/fastcomp/fastcomp/bin'\nBINARYEN_ROOT = '{sdk}/fastcomp'\nEMSCRIPTEN_ROOT = '{sdk}/fastcomp/emscripten'\nNODE_JS = '{sdk}/node/12.9.1_64bit/bin/node'\nTEMP_DIR = '/tmp'\nCOMPILER_ENGINE = NODE_JS\nJS_ENGINES = [NODE_JS]\n")
PY
fi
crypto="$task_root/.toolchain/openssl-3.5.9"
prefix="$task_root/build/native"
if [[ ! -f "$prefix/lib/libcrypto.a" ]]; then
  cd "$crypto"
  emconfigure env CROSS_COMPILE= ./Configure linux-generic32 no-asm no-shared no-threads no-tests no-dso no-engine no-module --with-rand-seed=none --prefix="$prefix" -D__STDC_NO_ATOMICS__=1 -Oz
  make -j4 build_generated
  make -j4 libcrypto.a
  mkdir -p "$prefix/lib" "$prefix/include"
  cp libcrypto.a "$prefix/lib/"
  cp -r include/openssl "$prefix/include/"
fi
if [[ ! -f "$prefix/lib/libssl.a" ]]; then
  cd "$crypto"
  make -j4 libssl.a
  cp libssl.a "$prefix/lib/"
fi
if [[ ! -f "$prefix/lib/libssh2.a" || ! -f "$prefix/libssh2-tizen-nonblocking-v1" ]]; then
  cd "$task_root/.toolchain/libssh2-1.11.1"
  emconfigure ./configure --host=wasm32-unknown-emscripten --disable-shared --disable-examples-build --disable-tests --with-crypto=openssl --with-libssl-prefix="$prefix" --without-libz --prefix="$prefix" CFLAGS=-Oz CPPFLAGS="-I$prefix/include" LDFLAGS="-L$prefix/lib"
  # Autoconf can compile fcntl here, but Samsung aborts F_SETFL on sockets.
  # core.c creates every socket with SOCK_NONBLOCK; libssh2 must retain it.
  python3 - <<'PY'
from pathlib import Path
import re
p=Path('src/libssh2_config.h')
s=p.read_text()
for name in ['HAVE_O_NONBLOCK','HAVE_FIONBIO','HAVE_IOCTLSOCKET_CASE','HAVE_SO_NONBLOCK']:
    s=re.sub(r'^#define '+name+r' 1$', '/* #undef '+name+' */', s, flags=re.M)
p.write_text(s)
PY
  make clean
  make -j4
  make install
  printf '%s\n' 'Socket mode owned by core.c: SOCK_NONBLOCK at creation' > "$prefix/libssh2-tizen-nonblocking-v1"
fi
cd "$task_root"
emcc native/core.c -I"$prefix/include" "$prefix/lib/libssh2.a" "$prefix/lib/libcrypto.a" -Oz -s ENVIRONMENT_MAY_BE_TIZEN=1 -s MODULARIZE=1 -s EXPORT_NAME=ShellCore -s ALLOW_MEMORY_GROWTH=1 -s TOTAL_MEMORY=16777216 -s WASM_MEM_MAX=67108864 -s ERROR_ON_UNDEFINED_SYMBOLS=1 -s EXPORTED_FUNCTIONS='["_ts_init","_ts_generate","_ts_rng_test","_ts_connect","_ts_tick","_ts_hostkey","_ts_trust","_ts_auth","_ts_read","_ts_write","_ts_resize","_ts_close","_ts_error","_malloc","_free"]' -s EXTRA_EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' -o dist/native/core.js
