#!/usr/bin/env bash
# Copyright 2026 Piotr Adamski (piotr-adamski)
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail
serial="${1:?Usage: bash scripts/install-tv.sh TV_IP:26101 [SIGNED_WGT]}"
package="${2:-build/sdk-package/tizen-shell.wgt}"
[[ "$serial" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:26101$ ]] || { echo 'Expected a TV IPv4 address and :26101.' >&2; exit 2; }
[[ -f "$package" ]] || { echo 'Signed package not found.' >&2; exit 2; }
sdb="${SDB:-sdb}"
appid=$(python3 -c 'import xml.etree.ElementTree as E; print(E.parse("app/config.xml").find("{http://tizen.org/ns/widgets}application").attrib["id"])')
"$sdb" connect "$serial"
[[ "$("$sdb" -s "$serial" get-state)" == device ]]
tizen="${TIZEN_CLI:-tizen}"
"$tizen" install -s "$serial" --name "$(basename "$package")" -- "$(dirname "$package")"
"$tizen" run -s "$serial" -p "$appid"
