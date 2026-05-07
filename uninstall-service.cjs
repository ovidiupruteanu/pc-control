const path = require('path')
const { execFileSync } = require('child_process')
const { Service } = require('node-windows')

function unregisterLockTask() {
    try {
        execFileSync('schtasks', ['/Delete', '/TN', 'PCControlLock', '/F'], { stdio: 'inherit' })
    } catch (err) {
        // Task may not exist; not fatal.
    }
}

const svc = new Service({
    name: 'PC Control',
    script: path.join(__dirname, 'index.js'),
})

svc.on('uninstall', () => {
    unregisterLockTask()
    console.log('Service uninstalled.')
})
svc.on('alreadyuninstalled', () => {
    unregisterLockTask()
    console.log('Service is not installed.')
})
svc.on('error', (err) => console.error('Service error:', err))

svc.uninstall()
