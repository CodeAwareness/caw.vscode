import process from 'process'
import vscode from 'vscode'
import os from 'os'

const isWindows = os.platform() === 'win32' 

// TODO: move some/all these into VSCode extension configuration instead
const cawConfig = vscode.workspace.getConfiguration('codeAwareness')

/* eslint-disable-next-line */
const DEBUG = vscode.debug

// Dev mode when you have CodeAwareness VSCode Panel running locally; please configure local nginx.
const PORT_LOCAL = 8885

// SCHEMA used by VSCode to handle repository, SCM, etc
const CAW_SCHEMA = 'codeAwareness'

// API version
const SERVER_VERSION = 'v1'

// Where to load the Web Panel from
const EXT_URL = DEBUG && !isWindows ? `https://127.0.0.1:${PORT_LOCAL}` : 'https://vscode.codeawareness.com' // CAW Webview server

// Where to post requests to
const API_URL = DEBUG && !isWindows ? `https://127.0.0.1:${PORT_LOCAL}/api/${SERVER_VERSION}` : `https://api.codeawareness.com/${SERVER_VERSION}`

// Add this extension to the catalog of clients on CodeAwareness Local Service.
const CATALOG: string = cawConfig.get('catalog') || 'catalog'
const PIPE_CATALOG = CATALOG + (DEBUG ? '_dev' : '')
console.log('PIPE_CATALOG', PIPE_CATALOG)

const LOG_LEVEL = process.env.LOG_LEVEL || 'debug' // ['verbose', 'debug', 'error']

// EXTRACT_REPO_DIR where we gather all the files from common SHA commit, but only those touched by a peer
const EXTRACT_REPO_DIR = 'r'

export default {
  API_URL,
  CAW_SCHEMA,
  DEBUG,
  EXT_URL,
  EXTRACT_REPO_DIR,
  LOG_LEVEL,
  PIPE_CATALOG,
  PORT_LOCAL,
  SERVER_VERSION,
}
