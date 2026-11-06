# Build and install

## Requirements

Use Linux x86-64, Node.js 22+, pnpm 12.16.1, Docker, Python 3, `unzip` and `tar`. Samsung Emscripten 1.39.4.7 is pinned in `docs/toolchain-sources.json`; standard Emscripten is not an interchangeable replacement for Tizen's direct sockets.

You also need an SSH server with Ed25519 host keys, an unprivileged account and `tmux`. On the TV, a **physical keyboard is required** and a mouse is recommended. No credentials or account creation are included.

An Xbox Bluetooth controller is an optional pointer alternative; it is not required at launch and does not replace keyboard text entry. Pair it on the TV and follow [USAGE.md](USAGE.md#xbox-bluetooth-controller). Real hardware is required for gamepad acceptance.

## Compile

```sh
pnpm install --frozen-lockfile
node scripts/setup-toolchain.mjs
docker build -f scripts/Toolchain.Dockerfile -t tizen-shell-toolchain:1 scripts
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:$PWD" -w "$PWD" tizen-shell-toolchain:1 bash scripts/build-native.sh
pnpm build
pnpm test
pnpm typecheck
node tests/native-crypto.cjs
```

Downloads are checked against pinned SHA-256 values. The Docker image is a compiler environment, not a running service. SDKs and dependency archives stay in ignored directories and are not part of the source release.

Public builds use an empty target even if a developer has a local configuration file. Configure host, username, port and host trust on the TV. Do not publish prefilled builds.

The build copies the bundled DejaVu font, LICENSE, NOTICE, AUTHORS, component notices and the full `LICENSES/` directory into `dist/`. Keep them in signed packages.

## Preview

After compilation, `pnpm preview` serves a loopback-only desktop preview at `http://127.0.0.1:4173/`. Storage is replaced in the HTTP response with memory-only storage. This is a UI preview, not a substitute for a TV, WidgetData or real SSH testing.

## Prepare your TV and signing profile

Follow Samsung's [TV setup](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html) and [certificate instructions](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html). Enable Developer Mode on your own TV and authorize your build computer. Certificates can be tied to a device identifier; never commit them or share a package containing your device configuration.

The public manifest uses application `TizenShell.Terminal` and package `TizenShell`. This is a fresh community installation identity; it does not import any developer's private app data. Pick and keep your own valid application identity before first installation if needed. Changing identity or author certificate can prevent an in-place update or create a separate storage area.

Install the official Tizen/Samsung CLI and Certificate Extension. Create your certificate profile in its normal certificate manager; do not pass certificate passwords on a command line or put them in this repository.

```sh
TIZEN_PROFILE='your-certificate-profile' pnpm package
```

`TIZEN_CLI` may point to the installed `tizen` executable. The wrapper invokes Samsung's [documented packaging command](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/command-line-interface.html). Signing requires your own configured profile; it is not performed by GitHub CI.

## Install on your own TV

```sh
SDB=/path/to/sdb bash scripts/install-tv.sh TV_IP:26101 build/sdk-package/tizen-shell.wgt
```

Replace `TV_IP` with your address. The installer explicitly requires a target and reads the application ID from `app/config.xml`. It never discovers or selects a developer's TV automatically. It copies the signed package, installs it and starts it. Installing updates can interrupt connections; verify your remote tmux persistence policy first.

## Before a public source release

Run `pnpm check:publication`, tests and type checking in the clean publication repository. Publish source from Git-tracked files only. Do not upload local `.cache`, `.toolchain`, `dist`, `build`, device logs, terminal screenshots, certificate profiles, keys or a `.wgt` signed for a personal TV. A source release does not mean full product acceptance or universal TV support.
