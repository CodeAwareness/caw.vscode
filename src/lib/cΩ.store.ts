/**
 * Non reactive simple store. We don't need reactivity for this project, so this is more of a collection of variables.
 */
import * as vscode from 'vscode'

import { TCΩEditor } from '@/lib/cΩ.editor'
import CΩWS from '@/lib/cΩ.ws'

type TDiffRange = {
  range: {
    line: number,
    len: number, // len: 0 indicates an insert op
  },
  replaceLen: number,
}

export type TAuth = {
  user: any
  tokens: any
}

export type TChanges = {
  l?: Array<number>, // line numbers containing changes
  s?: string, // sha against which the changes are compiled
  k?: string, // the peer file url (stored on S3 or something)
}

export type TContributor = {
  diffDir: string, // the temp folder where the file is extracted
  diff: string, // filename only of the current diff
  lupd: Date, // date of last file update
  origin: string, // repo url
  email: string, // contributor email
  avatar: string, // profile pic of this contributor
  user: string, // user ID
  _id: string, // contribution ID
}

/* peerFS: {
   *   wsFolder: {
   *     folderName1: {
   *       fileName11: {},
   *       folderName11: {
   *         fileName111: {},
   *       },
   *     },
   *     folderName2: {
   *       fileName21: {},
   *     },
   *     fileName1: {}
   *     ...
   *   }
   * }
   */
export type TPeerFS = Record<string, any>

export type TTokens = {
  access: {
    token: string,
    expires: Date,
  },
  refresh: {
    token: string,
    expires: Date,
  },
}

export type TUser = {
  _id: string,
  name: string,
  avatar: string,
}

export const CΩStore = {
  activeContext: {
    uri: '',
    dirty: false,
  },
  activeFile: undefined as string | undefined,
  activeLine: undefined as number | undefined,
  activeTextEditor: null as TCΩEditor | null,
  projects: [] as any[],
  activeProject: undefined as any,
  selectedContributor: undefined as any,

  colorTheme: 1 as vscode.ColorThemeKind, // 1 = Light, 2 = Dark, 3 = High Contrast

  /* tmpDir: {
   *   name: '/tmp/peer8_-12750-bA2Le6JKQ4Ad/'
   *   ... // see npm tmp package
   * }
   */
  tmpDir: '/tmp/cΩ.vscode',

  /* peerFS: {
   *   wsFolder: {
   *     folderName1: {
   *       fileName11: {},
   *       folderName11: {
   *         fileName111: {},
   *       },
   *     },
   *     folderName2: {
   *       fileName21: {},
   *     },
   *     fileName1: {}
   *     ...
   *   }
   * }
   *
   * Just a tree structure, hashed for faster locating of files and folders
   */
  peerFS: {} as TPeerFS,

  doc: undefined as any | undefined, // active document (specific doc format for Atom, VSCode)
  line: 0, // cursor line nr in document

  panel: undefined as any,
  tokens: undefined as TTokens | undefined,
  user: undefined as TUser | undefined,
  ws: undefined as CΩWS | undefined,

  clear: () => {
    console.log('STORE CLEAR')
    CΩStore.tokens = undefined as unknown as TTokens
    CΩStore.user = undefined as unknown as TUser
    CΩStore.panel = undefined
    CΩStore.colorTheme = 1
    CΩStore.tmpDir = '/tmp/cΩ.vscode'
    CΩStore.peerFS = {}
    CΩStore.doc = undefined
    CΩStore.line = 0
  },

  reset: () => {
    console.log('STORE RESET')
    CΩStore.peerFS = {}
    CΩStore.doc = undefined
    CΩStore.line = 0
  }
}

export default CΩStore

let tokenInterval: ReturnType<typeof setTimeout>|undefined
let syncTimer: ReturnType<typeof setTimeout>|undefined

export const CΩWork = {
  // terminal (optional feature: client side processing using shell commands)
  tokenInterval,
  syncTimer,
}
