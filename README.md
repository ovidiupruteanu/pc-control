# pc-control

Network-controlled Windows commands (volume, media, sleep, lock, display) exposed over HTTP with SSDP discovery.

## Install / uninstall

Both commands need an **elevated shell** (Run as Administrator). The service runs as your user account, so the install needs your password to grant "Log on as a service".

PowerShell:
```powershell
$env:SERVICE_PASSWORD = "yourpassword"
npm run install-service
```

Git Bash:
```bash
SERVICE_PASSWORD="yourpassword" npm run install-service
```

To remove:
```
npm run uninstall-service
```

## Lock and display commands

Windows services run in Session 0, which can't reach your desktop. So these endpoints each trigger a scheduled task that runs in your session instead:

| Task | Endpoint |
| --- | --- |
| `PCControlLock` | `/lock` |
| `PCControlDisplayOff` | `/display/off` |
| `PCControlDisplayOn` | `/display/on` (runs with highest privileges, so it still works while an elevated window has focus) |

`npm run install-service` creates them. If you installed before a task was added, run `npm run install-service` again: on an installed service it only re-registers the tasks. `npm run uninstall-service` removes them.

The tasks only run while you're logged on. The display tasks run `pc-control.exe` from the project folder by full path, so re-run the install if you move the folder.

The `/display/switch/*` endpoints call `DisplaySwitch.exe` directly, so they only work when running with `npm start`, not as a service.

## Start / stop

Service name is `PC Control`. Both shells need elevation.

### PowerShell

```powershell
Start-Service "PC Control"
Stop-Service "PC Control"
Restart-Service "PC Control"
Get-Service "PC Control"     # status
```

### Git Bash

```bash
net start "PC Control"
net stop "PC Control"
sc query "PC Control"        # status
```
