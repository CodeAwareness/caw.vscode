import process from 'process'
import vscode from 'vscode'
// TODO: move some/all these into VSCode extension configuration instead

const cawConfig = vscode.workspace.getConfiguration('codeAwareness')

// TODO: find a way to detect DEV vs PROD execution mode, so we don't have to keep on switching DEBUG on and off in the config.
// To work in dev-mode set DEBUG to true. This will trigger loading the webpanel from localhost instead of codeawareness.com
const DEBUG = true

// Dev mode when you have CodeAwareness VSCode Panel running locally; please configure local nginx.
const PORT_LOCAL = 8885

// SCHEMA used by VSCode to handle repository, SCM, etc
const CAW_SCHEMA = 'codeAwareness'

// API version
const SERVER_VERSION = 'v1'

// Where to load the Web Panel from
const EXT_URL = DEBUG ? `https://127.0.0.1:${PORT_LOCAL}` : 'https://vscode.codeawareness.com' // CAW Webview server

// Where to post requests to
const API_URL = DEBUG ? `https://127.0.0.1:${PORT_LOCAL}/api/${SERVER_VERSION}` : `https://api.codeawareness.com/${SERVER_VERSION}`

// Add this extension to the catalog of clients on CodeAwareness Local Service.
const CATALOG: string = cawConfig.get('catalog') || 'catalog'
const PIPE_CATALOG = CATALOG + (DEBUG ? '_dev' : '')
console.log('PIPE_CATALOG', PIPE_CATALOG)

const LOG_LEVEL = process.env.LOG_LEVEL || 'debug' // ['verbose', 'debug', 'error']

// EXTRACT_BRANCH_DIR where we extract the file from a specific branch, to be compared with the activeTextEditor
const EXTRACT_BRANCH_DIR = 'b'

// EXTRACT_LOCAL_DIR where we write the contents of the activeTextEditor, to be compared with peer files or otherwise processed with git commands
const EXTRACT_LOCAL_DIR = 'l'

// EXTRACT_REPO_DIR where we gather all the files from common SHA commit, but only those touched by a peer
const EXTRACT_REPO_DIR = 'r'

// EXTRACT_PEER_DIR where we have the peer versions for the files touched by a single peer
const EXTRACT_PEER_DIR = 'e'

export default {
  API_URL,
  CAW_SCHEMA,
  DEBUG,
  EXT_URL,
  EXTRACT_BRANCH_DIR,
  EXTRACT_LOCAL_DIR,
  EXTRACT_PEER_DIR,
  EXTRACT_REPO_DIR,
  LOG_LEVEL,
  PIPE_CATALOG,
  PORT_LOCAL,
  SERVER_VERSION,
}
