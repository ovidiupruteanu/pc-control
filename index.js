import {exec} from 'child_process'
import os from 'os'
import http from 'http'
import {URL} from 'url'
import fs from 'fs'
import fsp from 'fs/promises'
import {v4 as uuidv4} from 'uuid'
import {Server as SSDPServer} from 'node-ssdp'
// import webhook from "./webhook.js";

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
            exec('pc-control sleep', {windowsHide: true})
            return response.end('sleep')

        case '/lock':
            exec('pc-control lock', {windowsHide: true})
            return response.end('lock')

        case '/display/off':
            exec('pc-control monitor off', {windowsHide: true})
            return response.end('display off')

        case '/display/on':
            exec('pc-control monitor on', {windowsHide: true})
            return response.end('display on')

        case '/display/switch/external':
            exec('DisplaySwitch.exe /external', {windowsHide: true})
            return response.end('display external')

        case '/display/switch/internal':
            exec('DisplaySwitch.exe /internal', {windowsHide: true})
            return response.end('display internal')

        case '/display/switch/extend':
            exec('DisplaySwitch.exe /extend', {windowsHide: true})
            return response.end('display extend')

        case '/display/switch/clone':
            exec('DisplaySwitch.exe /clone', {windowsHide: true})
            return response.end('display clone')

        case '/volume':
            let volume = parseInt(url.searchParams.get('volume'))
            if (isNaN(volume)) {
                response.statusCode = 400
                return response.end('Invalid volume')
            }
            volume = Math.min(Math.max(volume, 0), 100)

            exec(`pc-control volume ${volume}`, {windowsHide: true})

            return response.end(`volume: ${volume}`)

        case '/mute':
            exec(`pc-control mute on`, {windowsHide: true})
            return response.end('mute')

        case '/unmute':
            exec(`pc-control mute off`, {windowsHide: true})
            return response.end('unmute')

        case '/media/play_pause':
            exec(`pc-control media play_pause`, {windowsHide: true})
            return response.end('media play_pause')

        case '/media/stop':
            exec(`pc-control media stop`, {windowsHide: true})
            return response.end('media stop')

        case '/media/next':
            exec(`pc-control media next`, {windowsHide: true})
            return response.end('media next')

        case '/media/previous':
            exec(`pc-control media previous`, {windowsHide: true})
            return response.end('media previous')

        case '/status':
            response.setHeader('Content-Type', 'application/json')
            exec('pc-control status', (error, stdout, stderr) => {
                let status = stdout.trim().split(' ');
                response.end(JSON.stringify({
                    volume: status[0],
                    mute: status[1] === 'on' ? 'muted' : 'unmuted',
                }))
            });

            return

        // case '/webhook/update':
        //     const webhook = url.searchParams.get('url')
        //     fsp.writeFile('webhook', webhook, {encoding: 'utf8'})
        //     return response.end()
        //
        // case '/webhook/delete':
        //     fsp.writeFile('webhook', '', {encoding: 'utf8'})
        //     return response.end()

        default:
            response.statusCode = 404
            return response.end('404 Not Found')

    }


}).listen(port)

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
