import { EventEmitter } from 'node:events'
import ipc from 'node-ipc'

import CΩWorkspace from './cΩ.workspace'

export type Class<T> = new (...args: any[]) => T

const shortid = () => {
  return new Date().valueOf().toString() // we run multiple editors, yes, but we run them as a user on a local computer, so this is fine.
}

/* Internal communication is done via EventEmitter to simulate a real socket */
const wsocket = new EventEmitter()

/* We send a GUID with every requests, such that multiple instances of VSCode can work independently;
 * TODO: perhaps allow different users logged into different VSCode instances? IS THIS SECURE? (it will require rewriting some of the local service)
 */
const guid = shortid()
const ipcClient = new ipc.IPC()
const ipcCatalog = ipc

function initServer() {
  return new Promise((resolve, reject) => {
    console.log('connecting IPC', guid)
    ipcClient.connectTo(guid, () => {
      ipcClient.of[guid].on('message', (data: any) => {
        const { action, body, err } = data
        // originally I wrote this IPC using WebSockets, only to find out at the end of my toil that VSCode has WebSockets in dev mode only. Will refactor some day.
        wsocket.emit(action, body || err)
      })

      setTimeout(resolve, 4000)
    })
  })
}

const CΩWS = {
  guid,

  init: async function(): Promise<void> {
    ipcClient.config.socketRoot = '/var/tmp/'
    ipcClient.config.appspace = 'cΩ.'
    ipcClient.config.id = guid
    ipcClient.config.retry = 1500

    ipcCatalog.config.socketRoot = '/var/tmp/'
    ipcCatalog.config.appspace = 'cΩ.'
    ipcCatalog.config.id = 'catalog'
    ipcCatalog.config.retry = 1500

    ipcCatalog.connectTo('catalog', () => {
      ipcCatalog.of.catalog.on('connect', () => {
        console.log('IPC Client fifo OUT socket connected.')
        ipcCatalog.of.catalog.emit('clientId', guid)
        initServer()
          .then(() => CΩWS.transmit('auth:info'))
          .then(CΩWorkspace.init)
      })

      ipcCatalog.of.catalog.on('message', (message) => {
        console.log('MESSAGE RECEIVED ON Catalog', message)
      })
    })
  },

  /* Transmit an action, and perhaps some data. Recommend a namespacing format for the action, something like `<domain>:<action>`, e.g. `auth:login` or `users:query`. */
  transmit: function(action: string, data?: any) {
    return new Promise((resolve, reject) => {
      console.info(`WSS: will emit action: ${action}`)

      const handler = (body: any) => {
        console.info('WSS: resolved action', action, body)
        // wsocket.removeListener(action, handler)
        const data = typeof body === 'string' ? JSON.parse(body) : body
        resolve(data)
      }
      const errHandler = (err: any) => {
        console.info('WSS: wsocket error', action, err)
        // wsocket.removeListener(action, errHandler)
        const data = typeof err === 'string' ? JSON.parse(err) : err
        reject(data)
      }

      data = Object.assign(data || {}, { cΩ: guid })
      ipcClient.of[guid].emit('message', JSON.stringify({ action, data }))
      wsocket.on(`res:${action}`, handler)
      wsocket.on(`err:${action}`, errHandler)
    })
  },

  dispose: function() {
    // TODO: cleanup IPC
  },
}

export default CΩWS
