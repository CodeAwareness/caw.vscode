// TODO: move some/all these into VSCode extension configuration instead

const DEBUG = false

// Dev mode, please configure local nginx
const PORT_LOCAL = 8885

// SCHEMA used by VSCode to handle repository, SCM, etc
const CAW_SCHEMA = 'codeAwareness'

// API version
const SERVER_VERSION = 'v1'

// Where to load the Web Panel from
const EXT_URL = DEBUG ? `https://127.0.0.1:${PORT_LOCAL}` : 'https://vscode.codeawareness.com' // CAW Webview server

// Where to post requests to
const API_URL = DEBUG ? `https://127.0.0.1:${PORT_LOCAL}/api/${SERVER_VERSION}` : `https://api.codeawareness.com/${SERVER_VERSION}`

// Local communication with CodeAwareness local service
const SERVER_WSS = 'wss://127.0.0.1:48408'

// Where to subscribe for Code Awareness local service (pipe IPC)
const PIPE_CLIENTS = '/var/tmp/caw/clients'

// Workspace: SYNC_INTERVAL gives the timer for syncing with the server
const SYNC_INTERVAL = 1000 * 100 // download diffs from the server every minute or so

// Diffs: SYNC_THRESHOLD gives the throttling interval for sending and receiving diffs
const SYNC_THRESHOLD = 1000 // avoid too many send/receive requests per second

// TODO: what are we doing with this... can't remember why we diff against 5 prev commits
const MAX_NR_OF_SHA_TO_COMPARE = 5

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
  EXT_URL,
  EXTRACT_BRANCH_DIR,
  EXTRACT_LOCAL_DIR,
  EXTRACT_PEER_DIR,
  EXTRACT_REPO_DIR,
  LOG_LEVEL,
  MAX_NR_OF_SHA_TO_COMPARE,
  PIPE_CLIENTS,
  PORT_LOCAL,
  SERVER_VERSION,
  SERVER_WSS,
  SYNC_INTERVAL,
  SYNC_THRESHOLD,
}
