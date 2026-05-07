# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — runs `node index.js` directly (foreground, useful for development).
- `npm run install-service` — registers the app as a Windows service named "PC Control" via `node-windows`. Requires an **elevated shell** and `SERVICE_PASSWORD` env var (the service runs as the current user account, see Architecture). Optional overrides: `SERVICE_ACCOUNT`, `SERVICE_DOMAIN`.
- `npm run uninstall-service` — removes the service. Also requires elevation.
- `pc-control.exe` (compiled from `pc-control.ahk`) — must be on `PATH` for the server to work; the server `exec`s it by bare name (e.g. `pc-control sleep`). Recompile via Ahk2Exe after editing the source.

No test runner is wired up.

## Architecture

Two-process design: a **Node HTTP server** for the network surface, and an **AutoHotkey v1 helper** for everything that touches Windows.

### `index.js` — HTTP + SSDP server

- Single `http.createServer` with a `switch (url.pathname)` router. Each route shells out via `child_process.exec(...)` and returns a short text body. Adding a new endpoint = add a `case` and a corresponding `Case` in `pc-control.ahk` (or call a Windows binary directly, like the `DisplaySwitch.exe` routes).
- `/discovery` walks `os.networkInterfaces()` to find the interface matching the request's `Host` IP and returns `{id, name, interface, ip, port, mac}` JSON. Used by the companion app after SSDP discovery.
- `/status` is the only route that parses AHK output: `pc-control status` prints `"<volume> <mute>"` space-separated, parsed into `{volume: round(float), mute: 'muted'|'unmuted'}`.
- `node-ssdp` advertises USN `urn:SmartExpanse:service:PCControl:1` with `location.path = '/discovery'`, so LAN clients SSDP-search, hit `/discovery`, then call the control endpoints.
- The `uuid` file (gitignored runtime state, generated on first boot) is reused as both the device identity returned by `/discovery` and the SSDP `udn`. Don't regenerate it casually — paired clients key off it.

### `pc-control.ahk` — Windows control helper

AutoHotkey v1 (note: `#NoEnv`, `SoundGet`/`SoundSet`, `StringLower` are v1 syntax — do not rewrite as v2 unless deliberately migrating). Compiled with `;@Ahk2Exe-ConsoleApp` so the `.exe` keeps stdout attached for `/status`.

Subcommand dispatch is a top-level `Switch command` over `%1%`. Supported: `status`, `volume <0-100>`, `mute on|off`, `monitor on|off`, `lock`, `sleep`, `media play_pause|stop|next|previous`. The `monitor on` trick is a 1px `MouseMove` to wake the display; `monitor off` posts `WM_SYSCOMMAND SC_MONITORPOWER` to Program Manager.

### Windows service (`install-service.cjs` / `uninstall-service.cjs`)

`node-windows` wraps `index.js` as a service. The service is configured with `logOnAs` set to the **current user**, not `LocalSystem`. Even so, the process still runs in **Session 0** (services always do); `logOnAs` only sets identity, not session. This is enough for volume, media keys, sleep, and monitor on/off — those either propagate across sessions or work because the audio/power APIs are session-aware enough.

**`LockWorkStation` is the exception.** It only acts on the active console session and silently no-ops from Session 0. The workaround: a scheduled task named `PCControlLock` registered by the install script with `/IT` (interactive) and `/RU <user>`, which causes Task Scheduler to launch its action — `rundll32.exe user32.dll,LockWorkStation` — inside the user's session. The `/lock` route in `index.js` therefore calls `schtasks /Run /TN "PCControlLock"` instead of going through `pc-control.ahk`. The task is created in `install-service.cjs` and removed in `uninstall-service.cjs`.

Both scripts are CommonJS (`.cjs`) because `node-windows` is CJS and the package is `"type": "module"`. `node-windows` creates a `daemon/` directory next to `index.js` containing the wrapper `.exe` and rolling logs — gitignored, recreated on install.

### Inactive code

`webhook.js` and the `/webhook/*` routes in `index.js` are commented out. Don't reactivate without confirming intent — the prior design pushed state changes outward to a configured URL.
