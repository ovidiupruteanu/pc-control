import {Service} from 'node-windows'
import {dirname} from "path"
import {fileURLToPath} from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const script = `${__dirname}\\index.js`

// Create a new service object
const svc = new Service({
    name: 'PC Control',
    script: script
})

// Listen for the "uninstall" event so we know when it's done.
svc.on('uninstall', () => {
    console.log('Uninstall complete.')
    console.log('The service exists: ', svc.exists)
})

// Uninstall the service.
svc.uninstall()
