import * as vscode from 'vscode'
import * as _ from 'lodash'

import { getActiveTextEditor, getCode, setDirty, workspace } from '../vscode/vscode'

import { SYNC_INTERVAL } from '../config'
import { logger } from './logger'

import { CΩStore, CΩWork } from './cΩ.store'

import { CΩDeco   } from './cΩ.deco'
import { CΩPanel  } from './cΩ.panel'
import { CΩEditor } from './cΩ.editor'
import { CΩAPI    } from './cΩ.api'
import { CΩDiffs  } from './cΩ.diffs'
import { CΩSCM    } from './cΩ.scm'

function init() {
  CΩDiffs.init()
}

function dispose() {
  logger.info('WORKSPACE: dispose')
  // TODO: cleanup temp files
  if (CΩWork.syncTimer) clearInterval(CΩWork.syncTimer)
  if (CΩWork.tokenInterval) clearInterval(CΩWork.tokenInterval)
  CΩStore.panel?.dispose()
  CΩStore.panel = undefined
}

function setupTempFiles() {
  // TODO: get tmpDir from localService
  CΩAPI.localGET('/tmpDir')
    .then((data: any) => {
      CΩStore.tmpDir = data.tmpDir
      logger.info('WORKSPACE: temporary folder used: ', CΩStore.tmpDir)
    })
}

type AuthSetupType = {
  access: Record<string, any>,
  refresh: Record<string, any>,
  preEmpt: number,
}

function setupAuth({ access, refresh, preEmpt }: AuthSetupType) {
  const period = new Date(access.expires).valueOf() - new Date().valueOf() - (preEmpt || 60000)
  CΩWork.tokenInterval = setInterval(() => {
    CΩAPI.refreshToken(refresh.token)
  }, period)
}

/************************************************************************************
 * Synchronization routines for the client-server and extension-webview.
 * We're currently sending and downloading diffs on a timer.
 * For this we're setting up a worker (currently just an object in the CΩStore).
 *
 * TODO: add file system hook to send diffs when files are changed underneath VSCode.
 ************************************************************************************/
function setupWorker() {
  if (CΩWork.syncTimer) clearInterval(CΩWork.syncTimer)
  const syncInterval: number = vscode.workspace
    .getConfiguration('codeAwareness')
    .get('syncInterval') || SYNC_INTERVAL
  logger.info('WORKSPACE: setupWorker (syncInterval)', syncInterval)
  // TODO: maybe we don't need this anymore, since we're doing syncWithServer every time the user saves a document;
  // on second thought, syncWithServer also downloads new diffs, so it's important we do it periodically;
  // however, uploading diffs every time is a waste of traffic and local resources too,
  // so let's sync downloadDiffs periodically and uploadDiffs upon save document only;
  CΩWork.syncTimer = setInterval(syncWithServer, syncInterval)

  return sendAllProjects()
    .then(syncWithServer)
}

function sendAllProjects() {
  const { projects } = CΩStore
  return Promise.all(projects.map(CΩDiffs.sendDiffs))
}

/* Syncing workspace on a timer, as well as each time a file is saved. */
/* TODO: maybe add a parameter to only send the active file? (needs more work both on client and server) */
function syncWithServer() {
  const { projects } = CΩStore
  logger.log('WORKSPACE: Syncing with server (projects, user)', projects, CΩStore.user)
  if (!CΩStore.user || !projects.length) return
  // throttling functionality is in CΩDiffs
  return Promise.resolve()
    .then(() => {
      return Promise.all(projects.map(syncSCM))
    })
    .then(() => {
      // also wait for swarm auth to complete
      return CΩStore.swarmAuthStatus
    })
}

function syncProject() {
  CΩEditor.syncWebview()
  CΩEditor.updateDecorations()
}

/************************************************************************************
 * refreshChanges
 *
 * @param Object - VSCode editor
 *
 * Download changes from the server, update decorations, sync webview
 ************************************************************************************/
function refreshChanges(filePath: string) {
  if (!filePath) filePath = CΩStore.activeProject?.activePath
  logger.log('WORKSPACE: refreshChanges (editorFilePath, activeProject, user, tmp)', filePath, CΩStore.activeProject, CΩStore.user, CΩStore.tmpDir)
  if (!CΩStore.activeProject || !CΩStore.user) return Promise.resolve()
  if (CΩStore.tmpDir && filePath.includes(CΩStore.tmpDir)) return Promise.resolve() // Looking at a vscode.diff window
  const project = CΩStore.activeProject
  syncSCM(project)
  return CΩDiffs
    .refreshChanges(project, project.activePath)
    .then(syncProject)
}

/************************************************************************************
 * syncSCM
 *
 * @param Object - project object (in CΩStore)
 *
 * We sync the contributions with the VSCode TDP
 ************************************************************************************/
function syncSCM(project: TProject) {
  logger.log('WORKSPACE: syncSCM start', project, CΩStore.user)
  if (!project || !project.cSHA || !CΩStore.user) return Promise.resolve()
  const { origin, root } = project
  return CΩAPI
    .getRepo(origin)
    .then(({ data }) => {
      if (!data.contribs) return
      data.contribs.map(f => CΩSCM.addFile(root, f))
    })
}

/************************************************************************************
 * refreshLines
 *
 * @param Object { contentChanges }
 *
 * Refresh changed lines (orange hints in the ruler, line highlights in the editor).
 * TODO: think of a better name for these two functions: refreshLines, refreshChanges
 *
 * The vscodeChanges is an object received from VSCode, and contains the details about the changes that occured in the document.
 * The range lines numbers are zero indexed.
 * For a DELETE operation: range contains the range that was deleted, text is the empty string.
 * For an INSERT operation (including PASTE): range length is 0, text is the code that was inserted.
 *
 * Scenario to help visualize the folding algorithm:
 * Marked lines: 1, 2, 9, 13, 14, 20
 * change 1: we have removed 5 lines previously from line 8 through 13;
 * change 2: we have changed line 8;
 * change 3: we paste 2 new lines after line 11;
 * change 4: we press Enter line somewhere inside line 2
 * change 5: we delete line 12
 *
 * The result of these changes ([line, len], replaceLen), incrementally:
 * 1: changes: [8, 5], 1 (lines > 8 => max(8, line - 5))     Marked: 1, 2, 8, 9, 15
 * 2: changes: [8, 0], 1 (same ^^)                           --
 * 3: changes: [11, 0], 3 (lines > 11 => max(11, line + 2))  Marked: 1, 2, 8, 9, 17
 * 4: changes: [2, 1], 2 (lines > 2 => max(2, line + 1))     Marked: 1, 2, 9, 10, 18
 * 5: changes: [12, 1], 1 (lines > 12 => max(12, line -1))   Marked: 1, 2, 9, 10, 17
 ************************************************************************************/
function refreshLines({ contentChanges }) {
  if (!CΩStore.activeProject || !CΩStore.user || !contentChanges.length) return Promise.resolve()
  // TODO: maybe use the `document` object we receive along with contentChanges, to ensure correct project / fpath selection
  const project = CΩStore.activeProject
  const fpath = project.activePath
  // TODO: why sometimes we make a change, but we receive an empty contentChanges array?
  // logger.log('WORKSPACE: contentChanges', contentChanges)
  contentChanges.map(change => {
    logger.log('WORKSPACE: CHANGE', change)
    const startChar = change.range._start._character
    const endChar = change.range._end._character
    const startLine = change.range._start._line
    const endLine = change.range._end._line
    const endLineChar = isWindows ? '\r\n' : /\n|\r/
    const replaceLen = change.text.split(endLineChar).length - 1 // subtract 1 to eliminate the last carriage return char
    const range = {
      line: startLine + 1 - (!startChar && !(endChar - startChar)), // convert from VSCode zero index line numbers; and subtract 1 if it's line 0, char 0
      len: endLine - startLine,
    }
    const changes = { range, replaceLen }
    logger.log('WORKSPACE: refreshLines', range, replaceLen)

    project.editorDiff = project.editorDiff || {}
    const editorDiff = project.editorDiff
    editorDiff[fpath] = editorDiff[fpath] || []
    editorDiff[fpath].push(changes)

    if (!CΩDiffs.PENDING_DIFFS[fpath]) {
      CΩDiffs.shiftWithLiveEdits(project, fpath)
      delete editorDiff[fpath]
    }
  })
  CΩDeco.insertDecorations(true)
}

/************************************************************************************
 * Close text document
 *
 * (cleanup)
 ************************************************************************************/
function closeTextDocument(params) {
  console.log('WORKSPACE: closeTextDocument', params)
}

/************************************************************************************
 * setupRepoFrom
 *
 * @param number - cursor line number
 * @param object - the active document uri (VSCode object)
 ************************************************************************************/
function setupRepoFrom({ line, uri }) {
  const normUri = uri.toLowerCase() // TODO: is there a better way to do this for Windows? We sometimes get /c://some/dir and sometimes /C://some/dir (!)
  const roots = _.filter(CΩStore.projects, p => normUri.includes(p.root.toLowerCase()))
  logger.info('WORKSPACE: setupRepoFrom (uri, projects)', uri, CΩStore.projects, roots)
  if (!roots || !roots.length) {
    CΩPanel.postMessage({ command: 'setMode', data: { mode: 'empty' } })
    return Promise.reject(new Error(`File is not part of any projects in your workspaces: ${uri}`))
  }
  CΩStore.activeProject = roots.reduce((r, item) => {
    if (item.root.length > r.root.length) r = item
    return r
  }, { root: '' })
  if (!CΩStore.activeProject) throw logger.error('WORKSPACE: (setupRepoFrom): File is not part of an active repository') // TODO: cleanup this repo instead ?
  CΩStore.activeProject.activePath = getRelativePath(uri)
  CΩStore.activeProject.line = line
  const reOrigin = CΩStore.activeProject.origin
  logger.log('WORKSPACE: setupRepoFrom (active project origin)', CΩStore.activeProject.origin)
  if (!reOrigin) {
    logger.error('WORKSPACE: setupRepoFrom(): Project is not a cloud git repository (local only git repo?)')
    return Promise.reject(new Error(`File is not a part of a cloud repository: ${CΩStore.activeProject.root}`))
  }
  return Promise.resolve()
}

function getRelativePath(uri) {
  return uri.substr(CΩStore.activeProject.root.length + 1) // TODO: make a relative URI maybe ?
}

/************************************************************************************
 * Diff code slices navigation
 *
 * !!WORK IN PROGRESS!!
 * Ideally we could press a key combo to replace chunks of our code with the code from
 * our contributors diff, and cycle through all variations this way.
 * This would allow us to quickly check a single block of changes without having to
 * open the diff editor for each contributor.
 ************************************************************************************/
function highlight() {
  // TODO: highlight changes existing at peers
}

function saveCode() {
  const existingCode = getCode(getActiveTextEditor())
  setDirty(false)
  return writeFile(_tmpFile, existingCode)
    .then(() => _tmpFile)
}

function getSavedCode() {
  return readFile(_tmpFile).catch(err => null && err)
}

function cycleThroughUsers({ users, reverse }) {
  let sel = getSelectedContributor()
  if (sel) {
    let i = 0
    const inc = reverse ? -1 : 1
    // find the selected user in the list
    while (users[i].user.toString() !== sel.user.toString() && i < users.length) i++
    // TODO: if sel user is not found (not in the list) --> trigger error ?
    // for now we simply select the next user in the list
    sel = users[i + inc] ? users[i + inc] : reverse ? users[users.length - 1] : users[0]
  } else {
    sel = users[0]
  }
  selectContributor(sel)

  return sel
}

function selectContributor(ct) {
  CΩStore.selectedContributor = ct
  CΩPanel.postMessage({ command: 'selectedContributor', data: { selectedContributor: ct } })
}

function getSelectedContributor() {
  return CΩStore.selectedContributor
}

/************************************************************************************
 * AdHoc sharing a file or the entire folder of the currently opened file.
 *
 * Share file will send the entire file, zipped, to CodeAwareness where it will be stores in an
 * S3 bucket, with a uniquely generated path that can be shared with other people.
 *
 * Share folder will first create a git archive of the folder, effectively duplicating the folder
 * into a temporary location. Then, its .git folder will be zipped and sent to CodeAwareness.
 *
 * @param Array - a list of names for the groups to be created.
 ************************************************************************************/
function receiveShared(invitation) {
  return CΩDiffs.receiveShared(invitation)
}

/**
 * TODO: how to decide whether it's adhoc mode or repo mode, next time when we open the same project?
 * One idea would be to store a token inside .cΩ config file. This sould be simple enough, but we're already adding a .git folder.
 * For a PowerPoint it's not even possible, because it rewrites the entire structure upon saving the file.
 */
function shareFile({ groups }) {
  return CΩDiffs
    .shareFile(CΩStore.activeProject.activePath, groups)
    .then(data => {
      CΩPanel.postMessage({ command: 'setMode', data: { mode: 'adhoc' } })
    })
}

function shareFolder(groups) {
  return CΩDiffs.shareFolder(CΩStore.activeProject.root, groups, CΩStore.activeProject.activePath)
}

/************************************************************************************
 * Export module
 ************************************************************************************/
export const CΩWorkspace = {
  closeTextDocument,
  cycleThroughUsers,
  dispose,
  getActiveTmpFile,
  getRelativePath,
  getSavedCode,
  getSelectedContributor,
  highlight,
  init,
  refreshChanges,
  refreshLines,
  saveCode,
  selectContributor,
  setupAuth,
  setupRepoFrom,
  setupWorker,
  setupTempFiles,
  shareFile,
  shareFolder,
  syncProject,
  syncWithServer,
}
