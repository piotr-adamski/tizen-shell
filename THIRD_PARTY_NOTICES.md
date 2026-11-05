# Third-party notices and authorship chain

Original tizen-shell contributions are Apache-2.0, copyright 2026 Piotr Adamski (piotr-adamski). This does not relicense third-party code or the font. Their original notices and upstream author lists are preserved below.

| Component | Version / role | License | Authorship / notice |
|---|---|---|---|
| [xterm.js](https://github.com/xtermjs/xterm.js) | 5.5.0; terminal renderer | [MIT](LICENSES/xterm.txt) | [Original notices/authors](LICENSES/xterm.txt) |
| [@xterm/addon-fit](https://github.com/xtermjs/xterm.js) | 0.10.0; terminal sizing | [MIT](LICENSES/xterm-fit.txt) | [Original notices/authors](LICENSES/xterm-fit.txt) |
| [OpenSSL](https://github.com/openssl/openssl) | 3.5.9; WASM cryptography | [Apache-2.0](LICENSES/openssl.txt) | [Original notices/authors](LICENSES/openssl-AUTHORS.md) |
| [libssh2](https://github.com/libssh2/libssh2) | 1.11.1; WASM SSH protocol | [BSD-3-Clause](LICENSES/libssh2.txt) | [Original notices/authors](LICENSES/libssh2-AUTHORS.txt) |
| [Emscripten runtime](https://github.com/emscripten-core/emscripten) | 1.39.4.7 Samsung bundle; generated JavaScript/WASM runtime | [MIT OR NCSA](LICENSES/emscripten.txt) | [Original notices/authors](LICENSES/emscripten-AUTHORS.txt) |
| [Samsung Emscripten extensions](https://developer.samsung.com/smarttv/develop/extension-libraries/webassembly/tizen-sockets-extension/tizen-sockets-extension.html) | 1.39.4.7; Tizen socket host bindings | [MIT OR NCSA](LICENSES/emscripten.txt) | [Original notices/authors](LICENSES/samsung-emscripten-notices.txt) |
| [musl libc](https://musl.libc.org/) | bundled with pinned Emscripten; linked C runtime | [MIT AND other permissive file notices](LICENSES/musl.txt) | [Original notices/authors](LICENSES/musl-file-notices.txt) |
| [LLVM compiler-rt](https://llvm.org/) | bundled with pinned Emscripten; linked compiler builtins | [MIT OR NCSA; file-specific notices retained](LICENSES/compiler-rt.txt) | [Original notices/authors](LICENSES/compiler-rt-CREDITS.txt) |
| [dlmalloc](https://gee.cs.oswego.edu/dl/html/malloc.html) | 2.8.6; linked memory allocator | [CC0-1.0; integration MIT/NCSA](LICENSES/CC0-1.0.txt) | [Doug Lea release notice](LICENSES/dlmalloc-notice.txt) |
| [DejaVu Sans Mono](https://dejavu-fonts.github.io/) | 2.37; bundled unmodified font | [Bitstream-Vera AND LicenseRef-DejaVu-Public-Domain](LICENSES/dejavu.txt) | [Original notices/authors](LICENSES/dejavu-AUTHORS.txt) |
| [esbuild](https://github.com/evanw/esbuild) | 0.25.12; build tool only | [MIT](LICENSES/esbuild.txt) | [Original notices/authors](LICENSES/esbuild.txt) |
| [TypeScript](https://github.com/microsoft/TypeScript) | 5.9.3; type checker only | [Apache-2.0](LICENSES/typescript.txt) | [Original notices/authors](LICENSES/typescript-NOTICE.txt) |

The xterm.js copyright lineage is Christopher Jeffrey (2012–2013), SourceLair (2014–2016), then the xterm.js authors. libssh2 retains the named holders in COPYING and the upstream AUTHORS list. OpenSSL supplies its copyright-author list. Samsung Electronics notices from 2019/2020 are retained for the Tizen extensions, alongside Emscripten and its bundled Node.js-derived path code notices.

For runtime portions with per-file notices, see [musl file notices](LICENSES/musl-file-notices.txt) and [compiler-rt file notices](LICENSES/compiler-rt-file-notices.txt). The inventories preserve possible runtime source notices; they do not assert that every inventoried file is linked into a particular build.

The font is an unmodified DejaVu Sans Mono 2.37 file. Bitstream owns the original Vera copyright; DejaVu changes are public domain. Its license is separate from Apache-2.0 and includes font naming/sale conditions. The font hash and provenance are in assets/fonts/provenance.json. Debian packaging code is not shipped.

The emsdk installer license is in [LICENSES/emsdk.txt](LICENSES/emsdk.txt). Compiler SDKs, Node.js binaries, Docker/Ubuntu images, SDK signing tools and the installed Samsung WebAPIs are external build/runtime requirements, not vendored products in this source archive. No Omarchy code, images or wallpaper are distributed; Omarchy is credited as visual/workflow inspiration only.

Versions, archive URLs and source checksums are recorded in docs/toolchain-sources.json and docs/third-party-components.json. The complete contributor history for an upstream project remains in its linked source repository. This is a provenance chain, not a claim that the original tizen-shell author wrote those components.

When redistributing a built application, preserve LICENSE, NOTICE, AUTHORS.md, this document and LICENSES/. Apache-2.0 section 4 retains attribution notices and identifies modifications; relevant upstream licenses remain applicable. Do not turn NOTICE into extra licensing restrictions.
