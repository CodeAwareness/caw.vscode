/******************************************************************
 * CodeAwareness Inter Process Communication with the Local Service
 ******************************************************************/
import IPC from '@/lib/ipc'
import config from '@/config'
import { CAWStatusbar } from '@/vscode/statusbar'

import CAWWorkspace from './caw.workspace'

export type Class<T> = new (...args: any[]) => T

const shortid = () => {
  return new Date().valueOf().toString() // we run multiple editors, yes, but we run them as a user on a local computer, so this is fine.
}

/* We send a GUID with every requests, such that multiple instances of VSCode can work independently;
 * TODO: perhaps allow different users logged into different VSCode instances? IS THIS SECURE? (it will require rewriting some of the local service)
 */
const guid = shortid()
const ipcClient = new IPC(guid) // FIFO pipe for operations
const ipcCatalog = new IPC(config.PIPE_CATALOG) // the local service watches this file to connect to all clients

const CAWIPC = {
  guid,
  ipcClient,
  ipcCatalog,

  init: async function(): Promise<void> {
    ipcClient.pubsub.removeAllListeners()
    ipcCatalog.connect(() => {
      ipcCatalog.emit(JSON.stringify({ action: 'clientId', data: guid })) // add this client to the list of clients managed by the local service
      initServer()
        .then(() => CAWIPC.transmit('auth:info')) // ask for existing auth info, if any
        .then(CAWWorkspace.init)
        .then(CAWStatusbar.init)
    })
  },

  /* Transmit an action, and perhaps some data. Recommend a namespacing format for the action, something like `<domain>:<action>`, e.g. `auth:login` or `users:query`. */
  transmit: function(action: string, data?: any) {
    return new Promise((resolve, reject) => {
      const handler = (body: any) => {
        console.info('IPC: resolved action', action, body)
        const data = typeof body === 'string' ? JSON.parse(body) : body
        resolve(data)
      }
      const errHandler = (err: any) => {
        console.info('IPC: socket error', action, err)
        let data
        if (typeof err === 'string') {
          try {
            data = JSON.parse(err)
          } catch (err) {
            reject('Operation failed.')
          }
        } else {
          reject(err)
        }
      }

      data = Object.assign(data || {}, { caw: guid })
      ipcClient.emit(JSON.stringify({ action, data })) // send data to the pipe
      ipcClient.pubsub.removeAllListeners(`res:${action}`)
      ipcClient.pubsub.removeAllListeners(`err:${action}`)
      ipcClient.pubsub.on(`res:${action}`, handler)    // process successful response
      ipcClient.pubsub.on(`err:${action}`, errHandler) // process error response
    })
  },

  dispose: function() {
    // TODO: cleanup IPC
  },
}

function initServer() {
  return new Promise(resolve => {
    setTimeout(() => {
      ipcClient.connect(() => {
        setTimeout(resolve, 2000)
      })
      ipcClient.pubsub.on('reset', CAWIPC.init)
    }, 2000) // let the VSCode and its extensions settle down, plus local service needs to create a client pipe connection
  })
}

export default CAWIPC
