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

## Lock command

The `/lock` endpoint requires a one-time scheduled task because Windows services run in Session 0, where `LockWorkStation` is a no-op. `npm run install-service` creates it automatically. If you installed before this was added, register it manually once (elevated shell):

PowerShell:
```powershell
schtasks /Create /TN "PCControlLock" /TR "rundll32.exe user32.dll,LockWorkStation" /SC ONCE /ST 00:00 /SD 01/01/2099 /RU "$env:USERDOMAIN\$env:USERNAME" /IT /F
```

Git Bash:
```bash
schtasks //Create //TN "PCControlLock" //TR "rundll32.exe user32.dll,LockWorkStation" //SC ONCE //ST 00:00 //SD 01/01/2099 //RU "$USERDOMAIN\\$USERNAME" //IT //F
```

`npm run uninstall-service` removes the task too.

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
