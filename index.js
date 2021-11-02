import {exec} from 'child_process'
import os from 'os'
import http from 'http'
import {URL} from 'url'
import fs from 'fs'
import fsp from 'fs/promises'
import {v4 as uuidv4} from 'uuid'
import {Server as SSDPServer} from 'node-ssdp'
import {speaker} from 'win-audio'
import webhook from "./webhook.js";

const port = 57339

const getUUID = async () => {
    try {
        await fsp.access('uuid', fs.constants.F_OK)
    } catch (err) {
        await fsp.writeFile('uuid', uuidv4(), {encoding: 'utf8'})
    }
    return await fsp.readFile('uuid', 'utf8')
}

const uuid = await getUUID()

http.createServer((request, response) => {

    const url = new URL(request.url, `http://${request.headers.host}`)

    switch (url.pathname) {

        case '/discovery':
            const requestIP = request.headers.host.split(':')[0]
            let ip, mac, interfaceName

            for (const [iName, addresses] of Object.entries(os.networkInterfaces())) {
                for (const address of addresses) {
                    if (address.address === requestIP) {
                        interfaceName = iName
                        ip = address.address
                        mac = address.mac
                    }
                }
            }

            response.setHeader('Content-Type', 'application/json')
            return response.end(JSON.stringify({
                id: uuid,
                name: process.env['COMPUTERNAME'] || os.hostname() || 'PC Control',
                'interface': interfaceName,
                ip, port, mac
            }))

        case '/':
            fs.readFile('index.html', (error, content) => {
                response.end(content, 'utf-8')
            })
            break

        case '/sleep':
            exec('start nircmd standby')
            return response.end('sleep')

        case '/lock':
            exec('Rundll32.exe user32.dll,LockWorkStation')
            return response.end('lock')

        case '/display/off':
            exec('start nircmd monitor async_off')
            return response.end('display off')

        case '/display/on':
            exec('start nircmd sendkeypress ctrl')
            return response.end('display on')

        case '/display/switch/external':
            exec('DisplaySwitch.exe /external')
            return response.end('display external')

        case '/display/switch/internal':
            exec('DisplaySwitch.exe /internal')
            return response.end('display internal')

        case '/display/switch/extend':
            exec('DisplaySwitch.exe /extend')
            return response.end('display extend')

        case '/display/switch/clone':
            exec('DisplaySwitch.exe /clone')
            return response.end('display clone')

        case '/volume':
            let volume = parseInt(url.searchParams.get('volume'))
            if (isNaN(volume)) {
                response.statusCode = 400
                return response.end('Invalid volume')
            }
            volume = Math.min(Math.max(volume, 0), 100)
            const sysVolume = Math.floor(65535 * volume / 100)

            exec(`start nircmd setsysvolume ${sysVolume}`)

            return response.end(`volume: ${volume}`)

        case '/mute':
            exec(`start nircmd mutesysvolume 1`)
            return response.end('mute')

        case '/unmute':
            exec(`start nircmd mutesysvolume 0`)
            return response.end('unmute')

        case '/status':
            response.setHeader('Content-Type', 'application/json')
            return response.end(JSON.stringify({
                pc: 'on',
                display: 'on',
                volume: speaker.get(),
                mute: speaker.isMuted() ? 'muted' : 'unmuted',
            }))

        case '/webhook/update':
            const webhook = url.searchParams.get('url')
            fsp.writeFile('webhook', webhook, {encoding: 'utf8'})
            return response.end()

        case '/webhook/delete':
            fsp.writeFile('webhook', '', {encoding: 'utf8'})
            return response.end()

        default:
            response.statusCode = 404
            return response.end('404 Not Found')

    }


}).listen(port)

speaker.polling(400);

speaker.events.on('change', (volume) => {
    // console.log("old %d%% -> new %d%%", volume.old, volume.new)
    webhook('volume', volume.new)
})

speaker.events.on('toggle', (status) => {
    // console.log("muted: %s -> %s", status.old, status.new)
    webhook(status.new ? 'mute' : 'unmute')
})

const ssdpServer = new SSDPServer({
    explicitSocketBind: true,
    // interfaces: ['Ethernet'/*, 'Wi-Fi'*/],
    suppressRootDeviceAdvertisements: true,
    allowWildcards: false,
    adInterval: 60 * 1000,
    location: {
        port: port,
        path: '/discovery'
    },
    udn: uuid,
    // customLogger: console.log
})

// server.addUSN('upnp:rootdevice')
// server.addUSN('urn:schemas-upnp-org:device:MediaServer:1')
// server.addUSN('urn:schemas-upnp-org:service:ContentDirectory:1')
// server.addUSN('urn:schemas-upnp-org:service:ConnectionManager:1')
ssdpServer.addUSN('urn:SmartExpanse:service:PCControl:1')

ssdpServer.on('advertise-alive', (heads) => {
    // console.log('advertise-alive', heads)
    // Expire old devices from your cache.
    // Register advertising device somewhere (as designated in http headers heads)
})

ssdpServer.on('advertise-bye', (heads) => {
    // console.log('advertise-bye', heads)
    // Remove specified device from cache.
})


// start server on all interfaces
ssdpServer.start().then(() => {
    console.log('SSDP Server started.')
}).catch(e => {
    console.log('SSDP Failed to start server:', e)
})
