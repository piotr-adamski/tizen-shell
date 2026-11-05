#!/usr/bin/env bash
# Copyright 2026 Piotr Adamski (piotr-adamski)
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail
profile="${1:-${TIZEN_PROFILE:-}}"
[[ -n "$profile" ]] || { echo 'Usage: bash scripts/package-sdk.sh CERTIFICATE_PROFILE' >&2; exit 2; }
[[ -f dist/native/core.wasm && -f dist/NOTICE && -f dist/LICENSE ]] || { echo 'Build the native core and UI first.' >&2; exit 2; }
mkdir -p build/sdk-package
"${TIZEN_CLI:-tizen}" package -t wgt -s "$profile" -o "$PWD/build/sdk-package" -- "$PWD/dist"
node scripts/release-manifest.mjs build/sdk-package/tizen-shell.wgt
