const path = require('path')

// Scheduled tasks that bridge the service (Session 0) into the interactive user session.
// install-service.cjs registers each one with /IT as the service user, so its action runs
// on the user's desktop. index.js triggers them with `schtasks /Run /TN <name>`.
//
// Tasks start in System32, not the project folder, so pc-control.exe needs its full path.
// It's a console app: `conhost.exe --headless` runs it without a console window
// (otherwise one flashes up, or Windows Terminal opens, on every call).
//
// `highest` registers the task with /RL HIGHEST. `monitor on` injects a mouse move, which
// Windows (UIPI) silently drops while an elevated window has focus unless the sender is
// elevated too.

const exe = path.join(__dirname, 'pc-control.exe')
const ahk = (args) => `conhost.exe --headless "${exe}" ${args}`

const TASKS = {
    lock: {name: 'PCControlLock', command: 'rundll32.exe user32.dll,LockWorkStation'},
    displayOff: {name: 'PCControlDisplayOff', command: ahk('monitor off')},
    displayOn: {name: 'PCControlDisplayOn', command: ahk('monitor on'), highest: true},
}

module.exports = {TASKS}
