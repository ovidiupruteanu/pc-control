# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — runs `node index.js` directly (foreground, useful for development).
- `npm run install-service` — registers the app as a Windows service named "PC Control" via `node-windows`. Requires an **elevated shell** and `SERVICE_PASSWORD` env var (the service runs as the current user account, see Architecture). Optional overrides: `SERVICE_ACCOUNT`, `SERVICE_DOMAIN`.
- `npm run uninstall-service` — removes the service. Also requires elevation.
- `pc-control.exe` (compiled from `pc-control.ahk`, committed in the repo root) — the server `exec`s it by bare name (e.g. `pc-control sleep`). It's found because `cmd.exe` searches the working directory (the project folder) first; it is **not** on `PATH`. Recompile via Ahk2Exe after editing the source.

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

`node-windows` wraps `index.js` as a service. The service is configured with `logOnAs` set to the **current user**, not `LocalSystem`. Even so, the process still runs in **Session 0** (services always do); `logOnAs` only sets identity, not session. This is enough for volume, media keys, and sleep — those either propagate across sessions or work because the audio/power APIs are session-aware enough.

**Lock and display on/off are the exception.** `LockWorkStation`, `monitor off` (posts to Explorer's "Program Manager" window), and `monitor on` (`MouseMove`) all act on the user's desktop, which Session 0 can't reach. The workaround: scheduled tasks registered by the install script with `/IT` (interactive) and `/RU <user>`, which causes Task Scheduler to launch each action inside the user's session. `tasks.cjs` is the single list of task names and actions; `install-service.cjs` creates them, `uninstall-service.cjs` removes them, and the `/lock`, `/display/off` and `/display/on` routes in `index.js` call `schtasks /Run /TN <name>` instead of running the command directly. Adding another desktop-bound route = add an entry to `TASKS` and re-run `npm run install-service` (on an installed service it only re-registers the tasks).

Task gotchas, all hit in practice:
- Tasks start in `System32`, so the AHK actions use the full path to `pc-control.exe` (built from `__dirname` in `tasks.cjs`). A bare name fails silently with exit code 0.
- The AHK actions are wrapped in `conhost.exe --headless` so the console app doesn't flash a window (or open Windows Terminal).
- `PCControlDisplayOn` has `highest: true` (`/RL HIGHEST`). Otherwise UIPI silently drops its `MouseMove` whenever an elevated window (e.g. Task Scheduler's `mmc`) has focus.
- `/TR` is capped at 261 characters.

`/display/switch/*` (`DisplaySwitch.exe`) still runs directly, so it only works under `npm start`, not as a service.

Both scripts are CommonJS (`.cjs`) because `node-windows` is CJS and the package is `"type": "module"`. `node-windows` creates a `daemon/` directory next to `index.js` containing the wrapper `.exe` and rolling logs — gitignored, recreated on install.

### Inactive code

`webhook.js` and the `/webhook/*` routes in `index.js` are commented out. Don't reactivate without confirming intent — the prior design pushed state changes outward to a configured URL.
