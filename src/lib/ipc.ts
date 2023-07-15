import os from 'os'
import net, { Socket } from 'net'
import { EventEmitter } from 'node:events'

const id = os.hostname()
const delimiter = '\f'
const isWindows = os.platform() === 'win32' 

class IPC {
  // Use this pubsub to listen for responses to your emits
  public pubsub = new EventEmitter()
  public socket = null as Socket | null
  public appspace = 'caw.'
  public socketRoot = isWindows ? '\\\\.\\pipe\\' : '/var/tmp/'
  public retryInterval = 2000 // retry connecting every 2 seconds
  public maxRetries = Infinity

  private guid = ''
  private retriesRemaining = Infinity
  private explicitlyDisconnected = false
  private ipcBuffer = '' as string
  private path = ''
  private resetTimer = 0

  constructor(guid: string) {
    // Note: originally I wrote this IPC using WebSockets over local https, only to find out at the end of my toil that VSCode has WebSockets in dev mode only.
    let path = this.path = this.socketRoot + this.appspace + (guid || id)
    this.guid = guid
  }

  connect(callback?: any) {
    if (this.socket && !this.socket.destroyed) {
      return callback && callback() // already connected
    }
    if (this.socket) this.socket.destroy()

    const socket = net.createConnection({ path: this.path })
    socket.setEncoding('utf8')
    this.socket = socket

    socket.on('error', err => {
      console.log('LS: socket error: ', err)
      if (this.resetTimer++ > 10) this.pubsub.emit('reset')
    })

    socket.on('connect', () => {
      console.log('LS: socket connected', this.path)
      this.retriesRemaining = this.maxRetries
      this.resetTimer = 0
      if (callback) callback()
    })

    socket.on('drain', (e: any) => {
      console.log('LS: Socket draining', e)
    })

    socket.on('ready', () => {
      console.log('LS: Socket ready')
    })

    socket.on('timeout', (e: any) => {
      console.log('LS: Socket timeout', e)
    })

    socket.on('end', (e: any) => {
      console.log('LS: Socket ended', e)
    })

    socket.on('close', (e: any) => {
      console.log('LS: connection closed', this.path,
        this.retriesRemaining, 'tries remaining of', this.maxRetries,
        e
      )

      if (this.retriesRemaining < 1 || this.explicitlyDisconnected) {
        console.log('LS: connection failed. Exceeded the maximum retries.', this.path)
        socket.destroy()
        return
      }

      setTimeout(() => {
        if (this.explicitlyDisconnected) {
          return
        }
        this.retriesRemaining--
        this.connect()
      }, this.retryInterval)
    })

    socket.on('data', data => {
      // console.log('LS: received data', this.path, data)
      this.ipcBuffer += data.toString()

      if (this.ipcBuffer.indexOf(delimiter) === -1) {
        console.log('LS: Messages are pretty large, is this really necessary?')
        return
      }

      const events = this.ipcBuffer.split(delimiter)
      events.pop()
      events.map(event => {
        const message = JSON.parse(event)
        const { action, body, err } = message
        console.log('LS: detected event', action, body, err)
        this.pubsub.emit(action, body || err)
      })

      this.ipcBuffer = ''
    })
  }

  emit(message: string) {
    if (!this.socket) {
      console.log('LS: cannot dispatch event. No socket for', this.path)
      return
    }
    console.log('LS: dispatching event to ', this.path, ' : ', message.substring(0, 256))
    this.socket.write(message + delimiter)
  }
}

export default IPC
