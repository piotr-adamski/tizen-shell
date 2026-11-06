# Compatibility and known limits

Development evidence exists for Samsung QE50Q67BAUXXH, Tizen 6.5, firmware T-NKLBDEUC-1720.7, logical viewport 1920×1080. No serial number, device ID, network address, certificate or owner configuration is included.

The earlier 0.3.3 prototype demonstrated four real SSH shells, secure storage and physical Super-key pane selection on that model. The 0.4.0-alpha.1 source release added configurable non-root usernames and portable publication/build files. Version 0.4.1-alpha.1 adds optional gamepad controls. Successful compilation or a desktop preview does not establish broad hardware compatibility.

On-device trials of the corresponding 0.4.1 code confirmed an Xbox Wireless Controller over Bluetooth, standard mapping, four axes and 17 buttons. The tester confirmed pointer movement and Menu opening application Settings followed by B returning to the terminals without opening TV settings. Pointer speed was tuned to 70% of the original prototype (770 logical px/s at a 1920 px viewport).

Automated real-browser tests cover A click/hold, xterm text selection, modal hit coordinates/scaling, preference saving, scrolling, physical mouse takeover, disconnect cancellation, keyboard Enter passthrough and duplicate TV Menu/Back events. These are synthetic input tests. The combined gamepad/four-active-SSH test was deferred, and physical scroll/selection/hotplug plus broader device acceptance remain open. The public application identity and signing profile still require testing on the installer's own TV.

A physical USB keyboard is the tested typing path. Bluetooth keyboards and mice, Polish AltGr combinations, every terminal shortcut, complete remote-control navigation, power/network lifecycle, long-running workloads and repeat reconnect/resource tests still need wider validation. A mouse is recommended; the Xbox controller can be an alternative pointer. Neither the remote nor the gamepad replaces keyboard text entry. Gamepad tests require real hardware: Samsung's TV emulator does not support them.

Tizen Sockets Extension and WidgetData are required. A standard desktop browser cannot provide the actual direct SSH transport. Newer or older TV engines may behave differently. Menu/Super mapping and event registration are model dependent.

The legacy Samsung compiler includes old build tooling, used only in the isolated compiler image. Dependency versions are pinned for reproducibility, not as a claim that every component is current or free of vulnerabilities. Review upstream advisories before changing the threat model or releasing binaries.

There is no SFTP/SCP, agent forwarding, port forwarding, automatic reconnect, saved passphrase or cloud synchronization. Persistent sessions depend on remote tmux configuration and living remote processes. Private operational backups, server provisioning helpers and signing automation from the development environment are excluded.
