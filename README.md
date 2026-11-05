# tizen-shell

A four-pane SSH terminal for Samsung Tizen TVs. The TV runs a local web application and a libssh2/OpenSSL WebAssembly client; your shell and tools run on your Linux server. There is no WebSSH gateway.

[Po polsku](README.pl.md) · [Build and install](docs/BUILD.md) · [Controls](docs/USAGE.md) · [Security](SECURITY.md) · [Compatibility](docs/COMPATIBILITY.md)

**A physical keyboard is required. A mouse is recommended.** The TV remote handles navigation and buttons, but cannot replace a keyboard for terminal work, passwords or text fields. The system on-screen keyboard is intentionally disabled. USB is the tested input path; Bluetooth compatibility depends on the TV and keyboard.

> **Privacy warning:** the TV operating system and manufacturer are outside this application's control. Privileged TV software could technically observe what you type, what appears in the terminal, credentials, and private keys while they are decrypted in memory. SSH protects the network connection; it does not hide your work from the TV itself. This is a threat-model warning, not a claim that Samsung is actually collecting your terminal sessions. Do not use this client for secrets you cannot entrust to the TV. Read [SECURITY.md](SECURITY.md).

## What it does

- Four independent SSH connections and four separately generated Ed25519 identities.
- Persistent remote `tmux` sessions, with local pane switching and zoom.
- Grid, Focus, Columns and Rows layouts, with fixed font-size ratios.
- Super shortcuts inspired by Omarchy, plus the existing Ctrl+B prefix.
- Independently verified host-key pinning and password-protected local key storage.
- Local code, libraries and font; no analytics, CDN or terminal transcript storage.

## Status

**Experimental source release: 0.4.0-alpha.1.** Earlier 0.3.3 builds were exercised on a Samsung QE50Q67BAUXXH with Tizen 6.5, including four SSH shells and physical Super-key pane selection. This publication candidate adds neutral configuration, a configurable non-root SSH username and portable build/licensing files. It has not completed full acceptance on all TV models or the full long-running/lifecycle test suite. See [compatibility and limitations](docs/COMPATIBILITY.md).

## Start here

1. Obtain Samsung's developer tools and a certificate profile for **your own TV**.
2. Build and sign from source using [docs/BUILD.md](docs/BUILD.md). This repository contains no pre-signed package, certificate, TV identity or server configuration.
3. Configure your own host, port, non-root username and independently verified Ed25519 host fingerprint in the app.
4. Generate four protected keys on the TV. Add only their public keys to the intended server account, using your normal administrator workflow.
5. Choose **Połącz 4**, unlock the four keys once for that connection group, and work in the remote shells.

The UI is currently Polish. The starter username `tvuser` is an example; replace it with your own unprivileged account. No account or host is provisioned automatically.

## Development

Node.js 22+, pnpm 12.16.1, Linux x86-64 and Docker are the documented authoring environment. The Samsung compiler is pinned separately from standard Emscripten. A desktop preview checks layout only and does not provide a browser SSH transport.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
```

For native compilation, preview, signing and installation, follow [BUILD.md](docs/BUILD.md).

## License and credits

Original contributions: **Apache-2.0**. Original author: **Piotr Adamski (piotr-adamski)**. Preserve [LICENSE](LICENSE), [NOTICE](NOTICE), [AUTHORS.md](AUTHORS.md) and the relevant dependency notices when redistributing. Dependencies are not relicensed by the project. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [CONTRIBUTING.md](CONTRIBUTING.md).
