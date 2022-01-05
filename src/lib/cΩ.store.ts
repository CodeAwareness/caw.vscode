import * as vscode from 'vscode'

let panel: vscode.WebviewPanel | undefined

type TDiffRange = {
  range: {
    range: number,
    len: number, // len: 0 indicates an insert op
  },
  replaceLen: number,
}

type TChanges = {
  l: Array<number>, // line numbers containing changes
  s: string, // sha against which the changes are compiled
  k: string, // the peer file url (stored on S3 or something)
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

export type TProject = {
  name: string,
  root: string,
  origin: string,
  repo: any, // TODO: TRepo
  branch: string,
  branches: Array<string>,
  scm: vscode.SourceControl,
  scIndex: any, // TODO: type of VSCode SCM index
  team: string, // team name
  head: string, // HEAD sha
  cSHA: string, // common SHA
  contributors: Array<string>, // list of repo contributors
  pendingGitDiff: boolean, // indicates when the local git diff operation is pending
  gitDiff: Record<string, TDiffRange>, // caching here the git diffs
  editorDiff: Record<string, Array<TDiffRange>>, // the editor diffs
  changes: Record<string, Record<string, TChanges>>, // peer diffs
  selectedContributor: TContributor, // currently selected contributor for diffs
  activePath: string, // current file being worked on (active editor)
  line: number, // current cursor line
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

export type TTmpDir = {
  name: string,
}

export const CΩStore = {
  colorTheme: 1 as 1 | 2 | 3, // 1 = Light, 2 = Dark, 3 = High Contrast
  user: undefined as TUser | undefined,
  tokens: undefined as TTokens | undefined,
  sockets: {} as any,
  panel: undefined as any,

  /* tmpDir: {
   *   name: '/tmp/peer8_-12750-bA2Le6JKQ4Ad/'
   *   ... // see npm tmp package
   * }
   */
  tmpDir: undefined as unknown as TTmpDir,

  /* projects: [{
   *   name, // convenience property = basename(root)
   *   root, // root path
   *   origin, // e.g. `https://github.com/peer8/peer8.vscode.git`
   *   repo, // repo object (vscode or atom specific)
   *   branch, // current branch
   *   branches, // list of local branches
   *   scm, // Source Control Manager (VSCode)
   *   scIndex, // VSCode SCM index
   *   team, // the team name, i.e. a team of peers with whom to share visibility (TODO)
   *   head, // the current commit (HEAD)
   *   cSHA, // the common SHA against which we diff all peers
   *   contributors, // comments, code contributors
   *   pendingGitDiff, // true / false - the local git diff operation is pending
   *   gitDiff: {
   *     'src/index.js': {
   *       range: { line: 12, len: 0 }, // len: 0 indicates an insert op
   *       replaceLen: 2,
   *     },
   *     ...
   *   }
   *   editorDiff: {
   *     'src/index.js': [
   *       {
   *         range: { line: 41, len: 3 },
   *         replaceLen: 0, // a delete op
   *       },
   *       {
   *         range: { line: 64, len: 2 },
   *         replaceLen: 4, // a replace op of original 2 lines with 4 new lines
   *       },
   *       ...
   *     ],
   *     ...
   *   },
   *   changes: {
   *     'src/index.js': {
   *       uid1: { l: [1, 4, 5, 10], s: sha1, k: s3key1 },
   *       uid2: { l: [1, 3, 4, 5], s: sha1, k: s3key2 },
   *       ...
   *     },
   *     ...
   *   }
   *   selectedContributor, // currently selected contributor for diffs
   *   }, ...]
   */
  projects: [] as TProject[],

  /* activeProject: {
   *   (same as projects, plus:)
   *   activePath, // currently opened file, relative path
   *   line, // current cursor line
   * }
  */
  activeProject: undefined as TProject|undefined,

  /* selectedContributor: {
   *   diffDir, // the temp folder where the file is extracted
   *   diff, // filename only of the current diff
   *   lupd, // date of file update
   *   origin, // github url of this repo
   *   email, // contributor email address
   *   avatar, // contributor profile pic
   *   user, // contributor user id
   *   _id, // contribution id
   * }
   */
  selectedContributor: undefined as TContributor|undefined,

  /* selectedBranch: 'dev'
  */
  selectedBranch: undefined as string|undefined,

  /* swarmStatus indicates whether the swarm authorization is pending or ready
  */
  swarmAuthStatus: undefined as unknown as Promise<any> | undefined,

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

  clear: () => {
    CΩStore.selectedContributor = undefined
  },

  emtpy: () => {
    CΩStore.tokens = undefined as unknown as TTokens
    CΩStore.user = undefined as unknown as TUser
    CΩStore.panel = undefined
    CΩStore.colorTheme = 1
    CΩStore.tmpDir = undefined as unknown as TTmpDir
    CΩStore.projects = []
    CΩStore.activeProject = undefined
    CΩStore.selectedBranch = undefined
    CΩStore.selectedContributor = undefined
    CΩStore.peerFS = {}
    CΩStore.doc = undefined
    CΩStore.line = 0
  },
}

let tokenInterval: ReturnType<typeof setTimeout>|undefined
let syncTimer: ReturnType<typeof setTimeout>|undefined

export const CΩWork = {
  // terminal (optional feature: client side processing using shell commands)
  tokenInterval,
  syncTimer,
}
