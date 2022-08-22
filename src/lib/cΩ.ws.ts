import type { Socket } from 'socket.io-client'
import io from 'socket.io-client'
import { nanoid } from 'nanoid'
import config from '@/config'

import logger from './logger'
import CΩStore from './cΩ.store'
import CΩWorkspace from './cΩ.workspace'

export type CΩSocket = Socket & {
  transmit: (action: string, data?: any, options?: any) => Promise<any>
}

export type Class<T> = new (...args: any[]) => T

export class CΩWS {
  public rootSocket: CΩSocket | null
  public uSocket: CΩSocket | null
  public rSocket: CΩSocket | null

  /* we send a GUID with every requests, such that multiple instances of VSCode can work independently;
   * TODO: allow different users logged into different VSCode instances; IS THIS SECURE? (it will require rewriting some of the local service)
   */
  public guid: string

  private _delay: number
  private expDelay(): number {
    this._delay = this._delay * 2
    return this._delay
  }

  private resetDelay() {
    this._delay = 200
  }

  public constructor() {
    this._delay = 200
    this.rootSocket = null
    this.uSocket = null
    this.rSocket = null
    this.guid = nanoid()
    this.init()
  }

  public init(): void {
    this.rootSocket = io(config.SERVER_WSS, {
      reconnectionDelayMax: 10000,
      timestampRequests: true,
      transports: ['websocket'],
    }) as CΩSocket

    logger.log('WSS: initializing sockets')
    this.rootSocket.on('connect', () => {
      logger.log('WSS: rootSocket connected')
      connectNamespace('users')
        .then((socket: CΩSocket) => {
          socket.on('connect', () => { logger.log('WSS: socketUser connected') })
          socket.transmit = this.transmit(socket)
          this.uSocket = socket
          socket.transmit('auth:info').then(CΩWorkspace.init)
        })

      connectNamespace('repos')
        .then((socket: CΩSocket) => {
          socket.on('connect', () => { logger.log('WSS: socketRepo connected') })
          socket.transmit = this.transmit(socket)
          this.rSocket = socket
        })
    })
  }

  /*
   * Transmit an action, and perhaps some data. Recommend a namespacing format for the action, something like `<domain>:<action>`, e.g. `auth:login` or `users:query`.
   * The response from Transient.server comes in the form of `res:<domain>:<action>` with the `domain` and `action` being the same as the transmitted ones.
   *
   * TODO: prevent multiple transmit requests to overload the system with pendingConnection (consider reconnect fn too)
   */
  private transmit(wsocket: CΩSocket) {
    return (action: string, data?: any, options?: any) => {
      let handled = false
      return new Promise((resolve, reject) => {
        this.resetDelay()
        const pendingConnection: any = () => {
          logger.info(`WSS: pending connection (delay: ${this._delay})`, action)
          setTimeout(() => {
            if (!handled) reject({ message: `Request timed out: ${action}` })
          }, options?.timeout || 3000)
          if (!wsocket.connected) {
            setTimeout(pendingConnection, this.expDelay())
            return
          }
          this.resetDelay()
          logger.info(`WSS: will emit action: ${action}`)
          if (!data) data = {}
          data.cΩ = this.guid
          wsocket.emit(action, data)
          wsocket.on(`res:${action}`, data => {
            handled = true
            resolve(data)
          })
          wsocket.on(`error:${action}`, err => {
            logger.log('WSS: wsocket error', action, err)
            handled = true
            reject(err)
          })
        }
        logger.info('WSS: attempting to transmit', action, data)

        pendingConnection()
      })
    }
  }
}

function connectNamespace(nsp: string): Promise<CΩSocket> {
  logger.log(`WSS: will setup namespace ${nsp}`)
  const socket = io(`${config.SERVER_WSS}/${nsp}`) as CΩSocket

  socket.on('connection', () => {
    logger.log(`WSS: ${nsp} socket connection ready`)
  })

  socket.on('reconnect', () => {
    logger.log(`WSS: ${nsp} socket reconnected`, socket)
  })

  socket.on('error', logger.error)

  return Promise.resolve(socket)
}

export default CΩWS
