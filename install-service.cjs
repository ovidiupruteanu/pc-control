const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const { Service } = require('node-windows')
const { TASKS } = require('./tasks.cjs')

const password = process.env.SERVICE_PASSWORD
if (!password) {
    console.error('SERVICE_PASSWORD env var is required.')
    console.error('The service runs as your user account so AHK volume/media/lock calls keep working,')
    console.error('and Windows requires the password to grant "Log on as a service".')
    console.error('')
    console.error('PowerShell:  $env:SERVICE_PASSWORD = "yourpassword"; npm run install-service')
    console.error('cmd.exe:     set SERVICE_PASSWORD=yourpassword && npm run install-service')
    process.exit(1)
}

const account = process.env.SERVICE_ACCOUNT || os.userInfo().username
const domain = process.env.SERVICE_DOMAIN || os.hostname()

function registerTasks() {
    // The service runs in Session 0, where lock and display calls don't reach the user's
    // desktop. These tasks are invoked by the matching routes via `schtasks /Run`; /IT makes
    // them run interactively in the user's session, where those calls actually work.
    for (const {name, command, highest} of Object.values(TASKS)) {
        try {
            execFileSync('schtasks', [
                '/Create',
                '/TN', name,
                '/TR', command,
                '/SC', 'ONCE',
                '/ST', '00:00',
                '/SD', '01/01/2099',
                '/RU', `${domain}\\${account}`,
                '/IT',
                ...(highest ? ['/RL', 'HIGHEST'] : []),
                '/F',
            ], { stdio: 'inherit' })
            console.log(`Scheduled task "${name}" registered.`)
        } catch (err) {
            console.error(`Failed to register ${name} scheduled task:`, err.message)
            console.error('The service will install, but the route using this task will not work until it exists.')
        }
    }
}

const svc = new Service({
    name: 'PC Control',
    description: 'Network-controlled PC commands (volume, media, sleep, lock, display).',
    script: path.join(__dirname, 'index.js'),
    workingDirectory: __dirname,
    logOnAs: { domain, account, password },
})

svc.on('install', () => {
    console.log(`Installed. Starting service as ${domain}\\${account}...`)
    registerTasks()
    svc.start()
})
svc.on('alreadyinstalled', () => {
    console.log('Service is already installed.')
    registerTasks()
})
svc.on('start', () => console.log('Service started.'))
svc.on('error', (err) => console.error('Service error:', err))

svc.install()
