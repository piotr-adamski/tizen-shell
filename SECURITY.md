# Security and privacy

## The TV is a trusted endpoint

**A television is not a private workstation merely because this application is open source.** The vendor's operating system, firmware, input stack, display stack and privileged services remain outside the project's control. They could technically inspect keystrokes, rendered terminal content, credentials and private keys while those keys are unlocked in memory. The project cannot prevent or reliably detect this. We have no evidence here that Samsung actually records these terminal sessions.

SSH protects data in transit between the TV client and SSH server. It does not protect plaintext at either endpoint. WidgetData and encrypted PKCS8 protect stored keys; neither protects against a sufficiently privileged TV component during use. JavaScript garbage collection also prevents a guarantee that every secret copy is erased immediately.

Use a dedicated unprivileged account, separate TV-only keys and limited server permissions. Avoid production administration and high-value secrets on a TV you cannot trust. If this threat is unacceptable, use a trusted computer instead.

## Application controls

The client checks a separately supplied Ed25519 host fingerprint, pins the host identity, generates distinct Ed25519 identities and protects private keys with a passphrase. It uses platform cryptographic randomness and fails closed when randomness or secure storage is unavailable. It has no password-login fallback, SSH forwarding, terminal transcript file, analytics or remote CDN.

The code requests network, WidgetData and input-device APIs. The legacy compiler requires `unsafe-eval` for its local WASM loader; the policy also permits the local Pepper storage bridge. These exceptions and the old toolchain are reasons for continued review, not a claim of a hardened sandbox.

A physical keyboard is required and a mouse is recommended. The system on-screen keyboard is disabled. Developer Mode and remote inspection are development facilities; limit their use to your trusted network and follow Samsung's guidance when you finish testing.

## Protect the server and keys

Never share a private key, passphrase, certificate, certificate profile, device identifier or full WidgetData export in an issue. Share a minimal reproduction using synthetic hostnames and synthetic data. Revoke TV keys on the server if the TV, passphrase or storage is compromised. Clearing app data alone does not revoke them.

Network restrictions on the TV do not restrict commands already authorized on the remote account. Configure server-side isolation and forwarding restrictions according to your needs.

## Reporting

Do not post credentials or an exploit containing real terminal data publicly. Use the repository's private vulnerability reporting channel when the maintainer has enabled it. If it is unavailable, contact the maintainer through their public GitHub profile to arrange a private channel; this project does not claim such a channel is already enabled. Public issues are suitable for sanitized non-sensitive bugs.

## Release status

This is an experimental source publication. It is not an independent security audit, a claim about Samsung's behavior, or completed long-running acceptance across TV models. Read `docs/COMPATIBILITY.md` before relying on it.
