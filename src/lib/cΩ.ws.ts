import io from 'socket.io-client'
import { SERVER_VERSION, SERVER_WSS } from '@/config'

import { logger } from './logger'
import { CΩStore } from './cΩ.store'

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

const socketOptions = {
  reconnectionDelayMax: 10000,
  forceNew: true,
  transports: ['websocket'],
  // @ts-ignore: No overload matches this call.
  origins: ['*'],
  withCredentials: true,
  timestampRequests: true,
  auth: { token: CΩStore.tokens?.access?.token },
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

function connectNamespace(nsp: any) {
  socketOptions.auth = { token: CΩStore.tokens?.access?.token }
  const socket = io(`${SERVER_WSS}/${nsp}`, socketOptions )

  socket.on('connection', () => {
    console.log(`${nsp} socket connection ready`)
  })

  socket.on('reconnect', () => {
    console.log(`${nsp} socket reconnected`, socket)
  })

  socket.on('error', console.error)

  return Promise.resolve(socket)
}

function init() {
  socketOptions.auth = { token: CΩStore.tokens?.access?.token }
  const rootSocket = io(`${SERVER_WSS}/${SERVER_VERSION}`, socketOptions)
  CΩStore.sockets.rootSocket = rootSocket

  console.log('initializing sockets on', SERVER_WSS, SERVER_VERSION)
  rootSocket.on('connect', () => {
    console.log('rootSocket CONNECT received')
    connectNamespace('users')
      .then(socket => {
        socket.on('connect', () => { logger.log('socketUser connected') })
        socket.on('cameOnline', ev => logger.log('USER cameOnline', ev))
        CΩStore.sockets.userSocket = socket
      })

    connectNamespace('repos')
      .then(socket => {
        socket.on('connect', () => { logger.log('socketRepo connected') })
        socket.on('updateAvailable', m => console.log('repoSocket update available', m))
        CΩStore.sockets.repoSocket = socket
      })
  })
}

const CΩWS = {
  init,
  transmit,
}

export {
  CΩWS,
}
