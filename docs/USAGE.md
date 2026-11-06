# Using the terminal

A physical keyboard is required. A mouse is recommended for settings, pane selection, text selection and scrolling. The remote control can navigate buttons, but on-screen text entry is disabled throughout the app.

An optional Xbox Bluetooth controller provides another pointer inside the app. Mouse and keyboard support remain available.

## Xbox Bluetooth controller

Pair the controller with the TV using its Bluetooth settings. After connecting or restarting the app, move a stick first so the TV exposes the controller through the Gamepad API; then press the desired button. No controller is required to launch the app.

| Control | Action |
|---|---|
| Left stick | Move the pointer; small deflections are more precise |
| D-pad | Move the pointer |
| A | Left-button press/release; click a control or hold to drag/select terminal text |
| Right stick, up/down | Scroll the area under the pointer |
| Menu | Open application Settings, like the **Ustawienia** button |
| B | Back: close the top application dialog or cancel key unlocking; on the workspace, open Settings as the remote's Back button does |

Menu does not reset an already open Settings form or override another open dialog. Holding Menu/B does not repeat the action. Buttons already held on reconnection/focus return must be released before another action. The pointer has an 18% radial dead zone and a curved response; maximum speed is 770 logical px/s at 1920 px viewport width. It hides after five idle seconds. Physical mouse movement hides it and returns control to the mouse; move the stick to resume gamepad control.

The pointer operates on application elements, including its scaled dialogs. It cannot control TV system menus or native system confirmation dialogs; use the physical keyboard/remote there. Text entry still requires the keyboard. Mouse reporting or selection inside a remote terminal application also depends on that application's mouse/tmux configuration.

Tested controller: Xbox Wireless Controller, reported as a standard gamepad with four axes and 17 buttons, over Bluetooth on the TV listed in [COMPATIBILITY.md](COMPATIBILITY.md). This does not establish support for every Xbox controller/TV combination. Samsung documents activation and emulator limits in its [Gamepad guide](https://developer.samsung.com/smarttv/develop/guides/user-interaction/gamepad.html).

## First setup

1. Open **Ustawienia**. Enter the SSH host, port and a non-root username. `tvuser` is a neutral example, not a provisioned account.
2. Obtain the server's Ed25519 SHA-256 fingerprint through an independent trusted channel. An administrator can use `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub -E sha256` on the intended server. Do not blindly trust the fingerprint of an unverified first connection.
3. Save the profile. Choose a strong key-protection passphrase and generate four identities. Reveal each public key only when needed and transfer only the public line to the intended server account through your normal trusted admin workflow. Never dump the entire WidgetData store.
4. Add each public key as a separate authorized key. The tested option pattern is `restrict,pty`, which preserves PTY and restricts forwarding. Check your OpenSSH version and effective configuration; do not overwrite existing authorized keys.
5. Select **Połącz 4**. Host identity is checked before authentication. Enter the key-protection passphrase once for the group. The application never saves that passphrase for a later connection.

Keys and host fingerprints are masked in Settings until you choose Show. Losing the passphrase means the encrypted private keys cannot be recovered by this app. Revoke lost keys on the server. Resetting TV data does not revoke server access.

## Super shortcuts

| Shortcut | Action |
|---|---|
| Super+1–4 | Select pane |
| Super+arrows | Focus in that direction; previous/next pane while zoomed |
| Super+Tab / Super+Shift+Tab | Next / previous pane |
| Super+F | Zoom / restore |
| Super+L | Cycle Grid, Focus, Columns, Rows |
| Super+J | Rows / Columns |
| Super+Space | Open / close application Settings |

On the tested TV, Windows/Super maps to Samsung's Menu key. The app registers Menu using its reported code; the remote's Menu button shares that mapping. Key codes and reserved-key behavior vary by model. Ctrl+B shortcuts remain available if Super cannot be captured on your TV. See [Samsung's mapping](https://developer.samsung.com/smarttv/develop/faq/user-interaction.html) and [Omarchy's shortcut reference](https://github.com/omacom/omarchy/blob/quattro/manual/07-hotkeys.md).

## Ctrl+B prefix

Press Ctrl+B, release, then 1–4 to choose a pane, `o`/`n` for next, `p` for previous, space to cycle layout, `z` to zoom, or `d` to disconnect that pane. Ctrl+B twice sends one Ctrl+B to the remote terminal.

For default tmux prefixes: two physical Ctrl+B presses followed by `d` detach the first remote tmux client; four followed by `d` reach a tmux nested inside that one. Release Ctrl before `d`. Disconnect preserves remote work only if the server's tmux policy and the shell/process itself keep running; do not type `exit` when you intend to preserve the shell.

## Fonts and layouts

The Settings font is the base for the largest Focus pane and zoom. Other Focus panes use 70%, Grid 80%, Columns 50%, Rows 70%. Fractional pixels are retained; smaller panes have no 16 px floor. Font and safe margin can be saved while SSH is active. Server, username, host trust and session-name changes require disconnection.

Default remote sessions are `tizen-shell-1` through `tizen-shell-4`. The app attaches using `tmux new-session -A -s NAME`. Reconnect is explicit; commands and queued input are not replayed.
