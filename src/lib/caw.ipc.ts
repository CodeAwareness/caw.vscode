/******************************************************************
 * CodeAwareness Inter Process Communication with the Local Service
 ******************************************************************/
import IPC from '@/lib/ipc'
import config from '@/config'
import { CAWStatusbar } from '@/vscode/statusbar'

import CAWWorkspace from './caw.workspace'

export type TClass<T> = new (...args: any[]) => T

export const shortid = () => {
  return new Date().valueOf().toString() + Math.random() // we run multiple editors, yes, but we run them as a user on a local computer, so this is fine.
}

/* We send a GUID with every request, such that multiple instances of VSCode can work independently;
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
    ipcCatalog.connect()
    ipcCatalog.pubsub.on('connected', () => {
      console.log('IPC CLIENT SOCKET READY')
      ipcCatalog.emit(JSON.stringify({ flow: 'req', domain: '*', action: 'clientId', data: guid, caw: guid })) // add this client to the list of clients managed by the local service
      initServer()
        .then(() => CAWIPC.transmit('auth:info')) // ask for existing auth info, if any
        .then(CAWWorkspace.init)
        .then(CAWStatusbar.init)
    })
  },

  /* Transmit an action, and perhaps some data. */
  transmit: function<T>(action: string, data?: any) {
    const domain = (['auth:info', 'auth:login'].includes(action)) ? '*' : 'code'
    const flow = 'req'
    const aid = shortid()
    const caw = CAWIPC.guid

    return new Promise<T>((resolve, reject) => {
      const handler = (body: any) => {
        ipcClient.pubsub.removeAllListeners(`res:${aid}`)
        ipcClient.pubsub.removeAllListeners(`err:${aid}`)
        console.info('CAWIPC: resolved action', action, body)
        const resdata = body.length ? JSON.parse(body) : body
        resolve(resdata)
      }
      const errHandler = (err: any) => {
        ipcClient.pubsub.removeAllListeners(`res:${aid}`)
        ipcClient.pubsub.removeAllListeners(`err:${aid}`)
        console.info('CAWIPC: socket error', action, err)
        if (typeof err === 'string') {
          // eslint-disable-next-line prefer-promise-reject-errors
          reject({ err })
        } else {
          reject(err)
        }
      }

      ipcClient.pubsub.on(`res:${domain}:${action}`, handler)    // process successful response
      ipcClient.pubsub.on(`err:${domain}:${action}`, errHandler) // process error response
      ipcClient.emit(JSON.stringify({ aid, caw, domain, flow, action, data })) // send data to the pipe
    })
  },

  dispose: function() {
    // TODO: cleanup IPC
    return this.transmit('auth:disconnect')
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
