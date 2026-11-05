# Compatibility and known limits

Development evidence exists for Samsung QE50Q67BAUXXH, Tizen 6.5, firmware T-NKLBDEUC-1720.7, logical viewport 1920×1080. No serial number, device ID, network address, certificate or owner configuration is included.

The earlier 0.3.3 prototype demonstrated four real SSH shells, secure storage and physical Super-key pane selection on that model. The 0.4.0-alpha.1 source candidate adds configurable non-root usernames and publication/build changes. These candidate changes require further on-TV acceptance; successful compilation or a desktop preview does not establish broad hardware compatibility.

A physical USB keyboard is the tested input path. Bluetooth keyboards and mice, Polish AltGr combinations, every terminal shortcut, complete remote-control navigation, power/network lifecycle, long-running workloads and repeat reconnect/resource tests still need wider validation. A mouse is recommended; the remote alone cannot perform text entry.

Tizen Sockets Extension and WidgetData are required. A standard desktop browser cannot provide the actual direct SSH transport. Newer or older TV engines may behave differently. Menu/Super mapping and event registration are model dependent.

The legacy Samsung compiler includes old build tooling, used only in the isolated compiler image. Dependency versions are pinned for reproducibility, not as a claim that every component is current or free of vulnerabilities. Review upstream advisories before changing the threat model or releasing binaries.

There is no SFTP/SCP, agent forwarding, port forwarding, automatic reconnect, saved passphrase or cloud synchronization. Persistent sessions depend on remote tmux configuration and living remote processes. Private operational backups, server provisioning helpers and signing automation from the development environment are excluded.
