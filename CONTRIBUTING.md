# Contributing

Read README, SECURITY and the compatibility limits first. Keep changes small and test the behavior you change. Use synthetic servers, account names and data in fixtures and issue reports.

Run `pnpm test`, `pnpm typecheck` and `pnpm check:publication`. For native changes, build the actual WASM core and run `node tests/native-crypto.cjs`. Input, lifecycle and renderer changes also need a real Samsung TV and physical keyboard; record the model/software and scope actually tested without including its identity, network configuration or terminal contents.

Do not add SSH gateways, plaintext key storage, host-check bypasses, trackers or downloaded runtime code as convenient substitutes. A desktop mock is not proof of native APIs or SSH. Do not mark full model support from a single successful launch.

Original contributions use Apache-2.0. Submit only work you can license on those terms. Preserve existing copyright, NOTICE, licenses and upstream credits, identify modified third-party files, and add your contribution to AUTHORS.md. The project does not require transferring someone else's copyright to the original author.

When changing dependencies, update versions, source checksums, LICENSES, component authorship records and the material copied into application packages. Keep SDKs, dependencies, binaries, certificates, device logs and real connection data out of Git.
