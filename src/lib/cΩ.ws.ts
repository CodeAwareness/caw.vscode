import EventEmitter from 'events'
import { appendFile, constants as fsConstants, createReadStream, createWriteStream, openSync } from 'fs'
import { open } from 'fs/promises'
import { spawn } from 'child_process'
import * as net from 'net' // TODO: check to see if this works in Windows

import config from '@/config'
import logger from './logger'
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
  private outHandle: any

  /* we send a GUID with every requests, such that multiple instances of VSCode can work independently;
   * TODO: allow different users logged into different VSCode instances; IS THIS SECURE? (it will require rewriting some of the local service)
   */
  public guid: string

  public constructor() {
    this.guid = shortid()
    this.wsocket = new EventEmitter()
    this.pipeIncoming = `/var/tmp/cΩ/${this.guid}.in.sock`
    this.pipeOutgoing = `/var/tmp/cΩ/${this.guid}.out.sock`

    this.init()
  }

  public async init(): Promise<void> {
    console.log('WSS: initializing pipe IPC with CΩ Local Service')
    const catalog = config.PIPE_CLIENTS

    const setupIncoming = () => {
      const fd = openSync(this.pipeIncoming, 'r+')
      /* @ts-ignore */
      this.fifoIn = createReadStream(null, { fd })
      this.transmit('auth:info').then(CΩWorkspace.init)

      this.fifoIn.on('data', (data: any) => {
        console.log('----- Received packet -----')
        console.log(data.toString())
        const { status, action, body } = JSON.parse(data.toString())
        this.wsocket.emit(`${status}:${action}`, body)
      })
    }

    const fifo = spawn('mkfifo', [this.pipeOutgoing])
    fifo.on('exit', async () => {
      // Read write flag is required even if you only need to write because otherwise you get ENXIO https://linux.die.net/man/4/fifo
      // Non blocking flag is required to avoid blocking threads in the thread pool
      this.outHandle = await open(this.pipeOutgoing, fsConstants.O_RDWR | fsConstants.O_NONBLOCK)
      // readable: false avoids buffering reads from the pipe in memory
      this.fifoOut = new net.Socket({ fd: this.outHandle.fd, readable: false })
      appendFile(catalog, `\n${this.guid}`, err => { err && logger.error })

      try {
        setupIncoming()
      } catch (err) {
        setTimeout(setupIncoming, 1000)
      }
    })
  }

  /*
   * Transmit an action, and perhaps some data. Recommend a namespacing format for the action, something like `<domain>:<action>`, e.g. `auth:login` or `users:query`.
   */
  public transmit(action: string, data?: any) {
    let handler: any
    let errHandler: any
    return new Promise(
      (resolve, reject) => {
        logger.info(`WSS: will emit action: ${action}`)
        if (!data) data = {}
        data.cΩ = this.guid
        handler = (body: any) => {
          console.log('WSS: resolved action', action, body)
          this.wsocket.removeListener(action, handler)
          resolve(body)
        }
        errHandler = (err: any) => {
          logger.log('WSS: wsocket error', action, err)
          this.wsocket.removeListener(action, errHandler)
          reject(err)
        }
        return this.fifoOut.write(JSON.stringify({ action, data }))
      })
      .then(shouldContinue => {
        // Backpressure if buffer is full
        if (!shouldContinue) {
          return EventEmitter.once(this.fifoOut, 'drain')
        }
        return
      })
      .then(() => {
        this.wsocket.on(`res:${action}`, handler)
        this.wsocket.on(`error:${action}`, errHandler)
      })
  }

  public dispose() {
    this.fifoIn.destroy()
    this.fifoOut.destroy()
    this.outHandle.close()
  }
}

export default CΩWS
