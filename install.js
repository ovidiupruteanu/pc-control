import {Service} from 'node-windows'
import {dirname} from 'path'
import {fileURLToPath} from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const script = `${__dirname}\\index.js`

// Create a new service object
const svc = new Service({
    name: 'PC Control',
    description: 'PC Control',
    script: script,
    nodeOptions: [
        '--harmony',
        '--max_old_space_size=4096'
    ],
    //, workingDirectory: '...'
    // allowServiceLogon: true
})

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install', () => {
    console.log('Install complete.')
    console.log('The service exists: ', svc.exists)
    svc.start()
})

svc.install()
