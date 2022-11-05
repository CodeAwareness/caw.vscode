import { EventEmitter } from 'node:events'
import { appendFileSync } from 'fs'
import net from 'node:net'

import config from '@/config'
import logger from './logger'
import CΩWorkspace from './cΩ.workspace'

export type Class<T> = new (...args: any[]) => T

const shortid = () => {
  return new Date().valueOf().toString() // we run multiple editors, yes, but we run them as a user on a local computer, so this is fine.
}

/* internal communication is done via EventEmitter to simulate a real socket */
const wsocket = new EventEmitter()
/* we send a GUID with every requests, such that multiple instances of VSCode can work independently;
 * TODO: allow different users logged into different VSCode instances; IS THIS SECURE? (it will require rewriting some of the local service)
 */
const guid = shortid()
/* using two named pipes for IPC */
const pipeIncoming = `/var/tmp/cΩ/${guid}.in.sock`
const pipeOutgoing = `/var/tmp/cΩ/${guid}.out.sock`
let fifoIn: any
let fifoOut: any

const CΩWS = {
  guid,
  init: async function(): Promise<void> {
    console.log('WSS: initializing pipe IPC with CΩ Local Service')
    const catalog = config.PIPE_CLIENTS

    appendFileSync(catalog, `\n${guid}`, 'utf8')

    console.log('WROTE TO CLIENTS')
    setTimeout(() => {
      console.log('WILL TRY CONNECTING')
      fifoOut = net.createConnection(pipeOutgoing)
      fifoOut.on('connect', () => {
        console.log('IPC Client fifo OUT socket connected.', pipeOutgoing)
        CΩWS.transmit('auth:info').then(CΩWorkspace.init)
      })

      fifoIn = net.createConnection(pipeIncoming)
      fifoIn.on('connect', () => {
        console.log('IPC Client fifo IN socket connected.', pipeIncoming)
        fifoIn.on('data', (data: any) => {
          const { action, body, err } = JSON.parse(data.toString('utf8'))
          wsocket.emit(action, body || err)
        })
      })
    }, 2000)
  },

  /*
   * Transmit an action, and perhaps some data. Recommend a namespacing format for the action, something like `<domain>:<action>`, e.g. `auth:login` or `users:query`.
   */
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
      fifoOut.write(JSON.stringify({ action, data }))
      fifoOut.write('Ωstdin endΩ')
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
