import process from 'process'
import vscode from 'vscode'
import os from 'os'

// TODO: move some/all these into VSCode extension configuration instead
const cawConfig = vscode.workspace.getConfiguration('codeAwareness')

/* eslint-disable-next-line */
const DEBUG = true // TODO: how to determine if we're running inside an extension host or as an installed extension

const LOCAL_WEB = true // Code Awareness web panel for Visual Studio Code

const LOCAL_API = false // Code Awareness API

// Dev mode when you have CodeAwareness VSCode Panel running locally; please configure local nginx.
const PORT_LOCAL = 8885

// SCHEMA used by VSCode to handle repository, SCM, etc
const CAW_SCHEMA = 'codeAwareness'

// API version
const SERVER_VERSION = 'v1'

// Where to post requests to
const API_URL = LOCAL_API ? `https://127.0.0.1:${PORT_LOCAL}/api/${SERVER_VERSION}` : `https://api.codeawareness.com/${SERVER_VERSION}`

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
  EXTRACT_REPO_DIR,
  LOCAL_WEB,
  LOCAL_API,
  LOG_LEVEL,
  PIPE_CATALOG,
  PORT_LOCAL,
  SERVER_VERSION,
}
