import { EventEmitter } from 'node:events'
import { appendFileSync } from 'fs'
import net from 'node:net'

import config from '@/config'
import logger from './logger'
import CΩWorkspace from './cΩ.workspace'

export type Class<T> = new (...args: any[]) => T

/* Packet separator in FIFO communication (this is really a separator between individual `transmit` commands) */
const PACKET_SEPARATOR = 'Ωstdin endΩ'
const ESCAPED_PACKSEP = 'Ω\\stdin end\\Ω'

/* Wait 2 seconds after adding itself to LS client list, then proceed with connecting to FIFO */
const FIFO_INIT_DELAY = 2000

const shortid = () => {
  return new Date().valueOf().toString() // we run multiple editors, yes, but we run them as a user on a local computer, so this is fine.
}

/* Internal communication is done via EventEmitter to simulate a real socket */
const wsocket = new EventEmitter()

/* We send a GUID with every requests, such that multiple instances of VSCode can work independently;
 * TODO: perhaps allow different users logged into different VSCode instances? IS THIS SECURE? (it will require rewriting some of the local service)
 */
const guid = shortid()

/* Using two named pipes for IPC */
const pipeIncoming = `/var/tmp/cΩ/${guid}.in.sock`
const pipeOutgoing = `/var/tmp/cΩ/${guid}.out.sock`
let fifoIn: any
let fifoOut: any

const CΩWS = {
  guid,

  init: async function(): Promise<void> {
    const catalog = config.PIPE_CLIENTS

    appendFileSync(catalog, `\n${guid}`, 'utf8')

    setTimeout(setupFIFO, FIFO_INIT_DELAY)

    function setupFIFO() {
      fifoOut = net.createConnection(pipeOutgoing)
      fifoOut.on('connect', () => {
        console.log('IPC Client fifo OUT socket connected.', pipeOutgoing)
        CΩWS.transmit('auth:info').then(CΩWorkspace.init)
      })

      fifoIn = net.createConnection(pipeIncoming)
      fifoIn.on('connect', () => {
        console.log('IPC Client fifo IN socket connected.', pipeIncoming)
        let buffer = ''

        fifoIn.on('data', (buf: any) => {
          const text = String(buf)
          if (!text?.length) return
          buffer += text
          if (!text.includes(PACKET_SEPARATOR)) {
            return
          }
          processBuffer(buffer)
        })

        function processBuffer(buffer: string) {
          if (!buffer.length) return
          const index = buffer.indexOf(PACKET_SEPARATOR)
          if (index === -1) return // still gathering chunks

          // Packet complete
          const packet = buffer.substr(0, index)
          console.log('----- Received packet -----')
          console.log(packet)

          const { action, body, err } = JSON.parse(packet.replace(ESCAPED_PACKSEP, PACKET_SEPARATOR))
          // originally I wrote this IPC using WebSockets, only to find out at the end of my toil that VSCode has WebSockets in dev mode only. Will refactor some day.
          wsocket.emit(action, body || err)

          // Process remaining bits in the buffer
          processBuffer(buffer.substr(index + PACKET_SEPARATOR.length))
        }
      })
    }
  },

  /* Transmit an action, and perhaps some data. Recommend a namespacing format for the action, something like `<domain>:<action>`, e.g. `auth:login` or `users:query`. */
  transmit: function(action: string, data?: any) {
    return new Promise((resolve, reject) => {
      logger.info(`WSS: will emit action: ${action}`)
      if (!data) data = {}
      data.cΩ = guid
      const handler = (body: any) => {
        logger.info('WSS: resolved action', action, body)
        // wsocket.removeListener(action, handler)
        const data = typeof body === 'string' ? JSON.parse(body) : body
        resolve(data)
      }
      const errHandler = (err: any) => {
        logger.info('WSS: wsocket error', action, err)
        // wsocket.removeListener(action, errHandler)
        const data = typeof err === 'string' ? JSON.parse(err) : err
        reject(data)
      }
      fifoOut.write(JSON.stringify({ action, data }).replace(PACKET_SEPARATOR, ESCAPED_PACKSEP))
      fifoOut.write(PACKET_SEPARATOR)
      console.log('WSS: write complete', fifoOut)
      wsocket.on(`res:${action}`, handler)
      wsocket.on(`err:${action}`, errHandler)
    })
  },

  dispose: function() {
    fifoIn?.destroy()
    fifoOut?.destroy()
  },
}

export default CΩWS
