const path = require('path')
const { execFileSync } = require('child_process')
const { Service } = require('node-windows')
const { TASKS } = require('./tasks.cjs')

function unregisterTasks() {
    for (const {name} of Object.values(TASKS)) {
        try {
            execFileSync('schtasks', ['/Delete', '/TN', name, '/F'], { stdio: 'inherit' })
        } catch (err) {
            // Task may not exist; not fatal.
        }
    }
}

const svc = new Service({
    name: 'PC Control',
    script: path.join(__dirname, 'index.js'),
})

svc.on('uninstall', () => {
    unregisterTasks()
    console.log('Service uninstalled.')
})
svc.on('alreadyuninstalled', () => {
    unregisterTasks()
    console.log('Service is not installed.')
})
svc.on('error', (err) => console.error('Service error:', err))

svc.uninstall()
