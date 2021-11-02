import fsp from "fs/promises"
import {dirname} from "path"
import {fileURLToPath} from "url"
import axios from "axios"

const __dirname = dirname(fileURLToPath(import.meta.url))

export default async (commandType, commandValue) => {

    const uuid = await fsp.readFile(`${__dirname}\\uuid`, 'utf8')
    const webhookUrl = await fsp.readFile(`${__dirname}\\webhook`, 'utf8')

    if (!uuid) {
        console.error('Missing UUID')
        return
    }

    if (!webhookUrl) {
        console.error('Missing webhook')
        return
    }

    switch (commandType) {
        case 'on':
        case 'off':
        case 'mute':
        case 'unmute':
            axios.post(webhookUrl, {
                id: uuid,
                command: commandType
            })
            break
        case 'volume':
            axios.post(webhookUrl, {
                id: uuid,
                command: commandType,
                volume: commandValue
            })
            break
    }
}
