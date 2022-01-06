import io from 'socket.io-client'

import { CΩStore } from './cΩ.store'
import { SERVER_WSS } from '@/config'

/*
 * Exponential wait for connection ready
 */
let _delay: number
const expDelay = () => {
  _delay = _delay * 2
  return _delay
}

const resetDelay = () => {
  _delay = 200
}

/*
 * Transmit an action, and perhaps some data, to CodeAwareness API
 * The response from the API comes in the form of `res:<action>` with the `action` being the same as the transmitted one.
 */
const transmit = (action: string, data = undefined) => {
  const domain = action.split(':')[0]
  let socket: any
  switch (domain) {
    case 'user':
      socket = CΩStore.sockets.userSocket
      break

    case 'repo':
      socket = CΩStore.sockets.repoSocket
      break

    default:
      throw new Error('invalid action trying to send to local service')
      // TODO: show error message instead?
  }
  return new Promise((resolve, reject) => {
    if (!socket) {
      console.log('While trying to transmit', action)
      return reject(new Error('no socket connection'))
    }
    resetDelay()
    const pendingConnection = (): any => {
      console.log('pendingConnection', _delay, socket.connected)
      if (!socket.connected) return setTimeout(pendingConnection, expDelay())
      resetDelay()
      console.log('Will emit user (action, data)', action, data)
      socket.emit(action, data)
      socket.on(`res:${action}`, resolve)
      socket.on(`error:${action}`, reject)
    }

    pendingConnection()
  })
}

const authRoute = {
  init: (): void => {
    /* TODO:
    const socket = CΩStore.sockets.userSocket
    socket.on('auth:info', authController.info)
    socket.on('auth:logout', authController.logout)
    // TODO: direct sync (without roundtrip to API)
    socket.on('local:auth:sync', authController.sync)
    */
  },
}

const repoRoute = {
  init: (): void => {
    /* TODO:
    const socket = CΩStore.sockets.repoSocket
    socket.on('repo:add', repoController.add)
    socket.on('repo:remove', repoController.remove)
    socket.on('repo:add-submodules', repoController.addSubmodules)
    socket.on('repo:remove-submodules', repoController.removeSubmodules)
    */
  },
}

const router = {
  init: (): void => {
    authRoute.init()
    repoRoute.init()
  },
}

const init = (): Promise<void> => {
  const rootSocket = CΩStore.sockets.rootSocket || CΩWS.reconnect()

  return new Promise((resolve, reject) => {
    let connected: boolean
    setTimeout(() => {
      if (!connected) reject(new Error('Could not connect to websocket for 5 seconds'))
    }, 5000)

    rootSocket.on('connect', () => {
      console.log('Websocket CONNECT. Assigning to rootSocket', rootSocket.auth)
      // auth(socket) // TODO: secure this server connection a bit more than just CORS
      router.init()
      connected = true
      resolve()
    })

    // TODO: type reason
    rootSocket.on('disconnect', (reason: any) => {
      console.log('WSIO rootSocket DISCONNECT', reason)
      return CΩWS.reconnect()
    })

    rootSocket.onAny((ev: any) => console.log('SOCKET DATA', ev))
    rootSocket.prependAny((ev: any) => console.log('SOCKET WILL EMIT', ev))

    rootSocket.on('CΩ', (e: any) => console.log('CODE_AWARENESS EVENT', e))
    rootSocket.on('error', (err: any) => console.error(err.description?.message))
    rootSocket.on('connect_error', (e: any) => console.log('WSIO ERROR rootSocket', e))
  })
}

const reconnect = (): any => {
  console.log('WSIO RECONNECT')
  // TODO: SECURITY: origin: [SERVER_WSS],
  const rootSocket = io(SERVER_WSS, {
    reconnectionDelayMax: 10000,
    forceNew: true,
    transports: ['websocket'],
    // @ts-ignore: No overload matches this call.
    origins: ['*'],
    withCredentials: true,
    timestampRequests: true,
    auth: { token: CΩStore.tokens?.access?.token },
  })

  CΩStore.sockets.rootSocket = rootSocket
  return rootSocket
}

export const CΩWS = {
  init,
  reconnect,
  transmit,

  reqHandler: (_req: any, _res: any, next: any): void => {
    next()
  },
}
