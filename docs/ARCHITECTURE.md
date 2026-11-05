# Architecture

A local TypeScript UI hosts four xterm.js terminals. Each connected pane owns a separate Worker, libssh2 state, direct Tizen socket and Ed25519 identity. The native core uses OpenSSL and Samsung's Emscripten socket bindings. The remote command attaches to a named tmux session; Linux tools run on the server.

WidgetData stores the small versioned profile, pinned host key, four encrypted PKCS8 identities and preferences. Passphrases and terminal history are not stored. Terminal scrollback is bounded and in RAM. Host mismatch blocks authentication; unavailable randomness or storage is not replaced with an insecure fallback.

Super/Menu is registered from the TV API instead of using a fixed model-specific code. Capture handlers route local shortcuts and block duplicate delayed keypress/input events. Releasing Super, losing focus or hiding the app clears modifier state. Existing Ctrl+B commands remain independent.

Layout changes reuse existing terminals and Workers, resize PTYs and apply fixed font ratios. They do not create new SSH identities or sessions. Hiding the application closes local connections and clears unlock inputs; returning requires explicit reconnect and unlock.

The platform's installed WebAPIs script and Tizen implementation are runtime requirements, not components shipped by this repository. The manufacturer's privileged software is outside this architecture's confidentiality boundary.
