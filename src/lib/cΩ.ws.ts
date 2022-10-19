import { EventEmitter, once } from 'node:events'
import { appendFile, constants as fsConstants, createReadStream, openSync } from 'fs'
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

/* internal communication is done via EventEmitter to simulate a real socket */
let wsocket = new EventEmitter()
/* we send a GUID with every requests, such that multiple instances of VSCode can work independently;
 * TODO: allow different users logged into different VSCode instances; IS THIS SECURE? (it will require rewriting some of the local service)
 */
let guid = shortid()
/* using two named pipes for IPC */
const pipeIncoming = `/var/tmp/cΩ/${guid}.in.sock`
const pipeOutgoing = `/var/tmp/cΩ/${guid}.out.sock`
let fifoIn: any
let fifoOut: any
let outHandle: any

const CΩWS = {
  guid,
  init: async function(): Promise<void> {
    console.log('WSS: initializing pipe IPC with CΩ Local Service')
    const catalog = config.PIPE_CLIENTS

    const setupIncoming = () => {
      const fd = openSync(pipeIncoming, 'r+')
      /* @ts-ignore */
      fifoIn = createReadStream(null, { fd })
      CΩWS.transmit('auth:info').then(CΩWorkspace.init)

      fifoIn.on('data', (data: any) => {
        const { action, body } = JSON.parse(data.toString('utf8'))
        wsocket.emit(action, body)
      })
    }

    const fifo = spawn('mkfifo', [pipeOutgoing])
    fifo.on('exit', async () => {
      // Read write flag is required even if you only need to write because otherwise you get ENXIO https://linux.die.net/man/4/fifo
      // Non blocking flag is required to avoid blocking threads in the thread pool
      outHandle = await open(pipeOutgoing, fsConstants.O_RDWR | fsConstants.O_NONBLOCK)
      // readable: false avoids buffering reads from the pipe in memory
      fifoOut = new net.Socket({ fd: outHandle.fd, readable: false })
      appendFile(catalog, `\n${guid}`, err => { err && logger.error })

      try {
        setupIncoming()
      } catch (err) {
        // TODO: better wait protocol; we need to wait here for the CΩ LS to create a pipe for us.
        setTimeout(setupIncoming, 1000)
      }
    })
  },

  /*
   * Transmit an action, and perhaps some data. Recommend a namespacing format for the action, something like `<domain>:<action>`, e.g. `auth:login` or `users:query`.
   */
  transmit: function(action: string, data?: any) {
    let handler: any
    let errHandler: any
    return new Promise((resolve, reject) => {
      logger.info(`WSS: will emit action: ${action}`)
      if (!data) data = {}
      data.cΩ = guid
      handler = (body: any) => {
        logger.info('WSS: resolved action', action, body)
        wsocket.removeListener(action, handler)
        resolve(body)
      }
      errHandler = (err: any) => {
        logger.info('WSS: wsocket error', action, err)
        wsocket.removeListener(action, errHandler)
        reject(err)
      }
      const hasFlushed = fifoOut.write(JSON.stringify({ action, data }))
        // Backpressure if buffer is full
      const ret = !hasFlushed && once(fifoOut, 'drain') || Promise.resolve()
      ret.then(() => {
        wsocket.on(`res:${action}`, handler)
        wsocket.on(`error:${action}`, errHandler)
      })
    })
  },

  dispose: function() {
    fifoIn.destroy()
    fifoOut.destroy()
    outHandle.close()
  },
}

export default CΩWS
