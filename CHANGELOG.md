# Changelog

## 0.4.1-alpha.1 — 2026-11-06

- Add an optional Xbox Bluetooth pointer while retaining physical mouse and keyboard support.
- Left stick / D-pad move, A clicks and drags, right stick scrolls, Menu opens Settings, B performs the same Back action as the remote.
- Use an 18% radial dead zone, curved acceleration, frame-time movement and a maximum pointer speed of 770 logical px/s at a 1920 px viewport (70% of the first gamepad prototype).
- Keep the pointer above scaled application dialogs; return control to the physical mouse on movement.
- Cancel pending actions on disconnect/focus loss and suppress duplicated TV key events before the Super-key handler.
- Add gamepad state regression tests and document Bluetooth activation, controls and acceptance limits in English and Polish.

Physical TV checks confirmed pointer movement and Menu/Back. The combined gamepad/four-SSH test was deferred. This remains an experimental source release; it includes no device-signed binary, personal settings, keys or private operational history.

## 0.4.0-alpha.1 — initial public source candidate

- Four-pane Tizen SSH/tmux prototype with Super and Ctrl+B controls.
- Neutral first-run profile and configurable non-root SSH account.
- Standalone build/sign/install instructions with no private service dependency.
- Apache-2.0 licensing, original-author attribution and preserved dependency notices.
- Explicit keyboard/mouse requirements and manufacturer/endpoint privacy warning.

The publication candidate is experimental; full device acceptance remains open. No personal TV package or operational Git history is distributed.
