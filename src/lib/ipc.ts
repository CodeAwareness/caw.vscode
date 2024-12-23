import os from 'os'
import path from 'node:path'
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
  public socketRoot = isWindows ? '\\\\.\\pipe\\' : os.tmpdir()
  public retryInterval = 2000 // retry connecting every 2 seconds
  public maxRetries = Infinity

  private retriesRemaining = Infinity
  private explicitlyDisconnected = false
  private ipcBuffer = '' as string
  private path = ''

  constructor(guid: string) {
    this.path = path.join(this.socketRoot, this.appspace + (guid || id))
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
      console.log('IPC: socket error: ', err)
    })

    socket.on('connect', () => {
      console.log('IPC: socket connected', this.path)
      this.retriesRemaining = this.maxRetries
      if (callback) callback()
    })

    socket.on('drain', (e: any) => {
      console.log('IPC: Socket draining', e)
    })

    socket.on('ready', () => {
      console.log('IPC: Socket ready')
      this.pubsub.emit('connected')
    })

    socket.on('timeout', (e: any) => {
      console.log('IPC: Socket timeout', e)
    })

    socket.on('end', (e: any) => {
      console.log('IPC: Socket ended', e)
    })

    socket.on('close', (e: any) => {
      console.log('IPC: connection closed', this.path,
        this.retriesRemaining, 'tries remaining of', this.maxRetries,
        e
      )

      if (this.retriesRemaining < 1 || this.explicitlyDisconnected) {
        console.log('IPC: connection failed. Exceeded the maximum retries.', this.path)
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
      // console.log('IPC: received data', this.path, data.toString().substring(0, 100))
      this.ipcBuffer += data.toString()

      if (this.ipcBuffer.indexOf(delimiter) === -1) {
        console.log('IPC: Messages are pretty large, is this really necessary?')
        return
      }

      const events = this.ipcBuffer.split(delimiter)
      events.map(event => {
        if (!event) return
        const message = JSON.parse(event)
        const { flow, domain, action, data, err } = message
        console.log('IPC: Will emit', flow, domain, action, data)
        this.pubsub.emit(`${flow}:${domain}:${action}`, data || err)
      })

      this.ipcBuffer = ''
    })
  }

  emit(message: string) {
    if (!this.socket) {
      console.log('IPC: cannot dispatch event. No socket for', this.path)
      return
    }
    console.log('IPC: dispatching event to ', this.path, ' : ', message.substring(0, 256))
    this.socket.write(message + delimiter)
  }
}

export default IPC
