import io from 'socket.io-client'
import { SERVER_WSS } from '@/config'

import { logger } from './logger'
import { CΩStore } from './cΩ.store'

function connectNamespace(nsp: any) {
  console.log(`will setup namespace ${nsp}`)
  const socket = io(`/${nsp}`)

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
  const rootSocket = io(SERVER_WSS, {
    reconnectionDelayMax: 10000,
    timestampRequests: true,
  })
  CΩStore.sockets.rootSocket = rootSocket

  console.log('initializing sockets')
  rootSocket.on('connect', () => {
    console.log('rootSocket CONNECT')
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

const wsIO = {
  init,
}

export {
  wsIO,
}
