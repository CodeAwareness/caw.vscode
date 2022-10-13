import EventEmitter from 'events'
import { createReadStream, createWriteStream, mkdirSync, openSync } from 'fs'
import { spawn, fork } from 'child_process'
// import * as net from 'net' // TODO: check to see if this works in Windows

import config from '@/config'
import logger from './logger'
import CΩStore from './cΩ.store'
import CΩWorkspace from './cΩ.workspace'

export type Class<T> = new (...args: any[]) => T

const shortid = () => {
  return new Date().valueOf().toString() // we run multiple editors, yes, but we run them as a user on a local computer, so this is fine.
}

export class CΩWS {
  public wsocket: EventEmitter
  private pipeIncoming
  private pipeOutgoing
  private fifoIn: any
  private fifoOut: any
  private fd: any

  /* we send a GUID with every requests, such that multiple instances of VSCode can work independently;
   * TODO: allow different users logged into different VSCode instances; IS THIS SECURE? (it will require rewriting some of the local service)
   */
  public guid: string

  public constructor() {
    this.guid = shortid()
    this.wsocket = new EventEmitter()
    this.init()

    this.pipeIncoming = `/var/tmp/cΩ/${this.guid}.vsin`
    this.pipeOutgoing = '/var/tmp/cΩ/${this.guid}.vsout'
  }

  public init(): void {
    /* TODO: test this instead on Windows
    const server = net.createServer(function(stream) {
      stream.on('data', function(c) {
        console.log('NET data:', c.toString())
      })
      stream.on('end', function() {
        console.log('NET END')
        server.close()
      })
    })

    server.listen('/tmp/test-cΩ.sock')

    var stream = net.connect('/tmp/test.sock')
    stream.write('hello')
    stream.end()
     */

    console.log('WSS: initializing IPC')
    const fifo = spawn('mkfifo', [this.pipeOutgoing])

    fifo.on('exit', () => {
      logger.log('Created Output Pipe')
      this.fd = openSync(this.pipeOutgoing, 'r+')
      /* @ts-ignore */
      this.fifoIn = createReadStream(null, { fd: this.fd })
      this.fifoOut = createWriteStream(this.pipeIncoming)

      this.transmit('auth:info').then(CΩWorkspace.init)

      this.fifoIn.on('data', (data: any) => {
        console.log('----- Received packet -----')
        console.log(data.toString())
        const { status, action, body } = JSON.parse(data.toString())
        this.wsocket.emit(`${status}:${action}`, body)
      })
    })
  }

  /*
   * Transmit an action, and perhaps some data. Recommend a namespacing format for the action, something like `<domain>:<action>`, e.g. `auth:login` or `users:query`.
   */
  public transmit(action: string, data?: any, options?: any) {
    return new Promise((resolve, reject) => {
      logger.info(`WSS: will emit action: ${action}`)
      if (!data) data = {}
      data.cΩ = this.guid
      const handler = (body: any) => {
        console.log('WSS: resolved action', action, body)
        this.wsocket.removeListener(action, handler)
        resolve(body)
      }
      const errHandler = (err: any) => {
        logger.log('WSS: wsocket error', action, err)
        this.wsocket.removeListener(action, errHandler)
        reject(err)
      }
      this.fifoOut.write(JSON.stringify({ action, data }))
      this.wsocket.on(`res:${action}`, handler)
      this.wsocket.on(`error:${action}`, errHandler)
    })
  }
}

export default CΩWS
