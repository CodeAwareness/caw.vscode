/**************************
 * Code Awareness workspace
 **************************/
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import logger from './logger'

import { CAWStore, CAWWork } from './caw.store'

import CAWDiffs from './caw.diffs'
import CAWEditor from './caw.editor'
import CAWSCM from './caw.scm'
import CAWIPC from './caw.ipc'
import CAWPanel from '@/lib/caw.panel'
import CAWTDP from '@/lib/caw.tdp'
// import { CodeActionTriggerKind } from 'vscode'

// TODO: this doesn't quite work.
const isWindows = !!process.env.ProgramFiles

// Sync actions from LS are defined here
const actionTable: Record<string, any> = {
  refresh: refreshActiveFile,
}

function init(data?: any) {
  console.log('Workspace: init', data)
  if (data?.user) {
    CAWStore.user = data.user
    CAWStore.tokens = data.tokens
    CAWDiffs.init()
    setupSync() // TODO: when we restart LS the client reconnects but we lose the sync (and it seems auth:info returns undefined?)
  }
  return setupTempFiles()
}

function dispose() {
  logger.info('WORKSPACE: dispose')
  // TODO: cleanup temp files
  if (CAWWork.syncTimer) clearInterval(CAWWork.syncTimer)
  CAWStore.panel?.dispose()
  CAWStore.panel = undefined
  CAWEditor.updateDecorations()
}

function setupTempFiles() {
  return CAWIPC.transmit('repo:get-tmp-dir', CAWIPC.guid)
    .then((data: any) => {
      CAWStore.tmpDir = data.tmpDir
      logger.info('WORKSPACE: temporary folder used: ', CAWStore.tmpDir)
    })
}

function setupSync() {
  CAWIPC.ipcClient.emit(JSON.stringify({ action: 'sync:setup', data: { cid: CAWIPC.guid } })) // don't use transmit, as that will overwrite the response handler
  CAWIPC.ipcClient.pubsub.on('res:sync:setup', syncGardener)
}

function closeTextDocument(params: any) {
  console.log('WORKSPACE: closeTextDocument', params)
}

function syncGardener(data: any) {
  if (!data) return
  const action = data.action
  if (actionTable[action]) actionTable[action](data)
}

/************************************************************************************
 * Diff code slices navigation
 *
 * Ideally we could press a key combo to replace chunks of our code with the code from
 * our contributors diff, and cycle through all variations this way.
 * This would allow us to quickly check a single block of changes without having to
 * open the diff editor for each contributor.
 ************************************************************************************/
function highlight() {
  // TODO: cycle through the changes while highlighting changes existing at peers
}

// TODO: add heartbeat so that we can clean up duplicate projects (which accumulate on Local Service due to restarting VSCode)
// Update: i think i solved this issue by cleaning up in the socket.on('close') event listener in LS
function addProject(project: any) {
  logger.log('WORKSPACE: addProject', project)
  CAWSCM.addProject(project)
  CAWTDP.addProject(project)
  CAWStore.activeProject = project
  return project
}

function refreshActiveFile() {
  console.log('refreshing active file')
  if (!CAWStore.activeTextEditor) { console.log('no active text editor'); return }

  return CAWIPC.transmit('repo:active-path', { fpath: CAWStore.activeTextEditor.document.uri.path, cid: CAWIPC.guid, doc: CAWStore.activeTextEditor.document.getText() })
    .then(addProject)
    .then(CAWEditor.updateDecorations)
    .then(CAWPanel.updateProject)
    .then((project: any) => {
      Object.keys(project.changes).map(CAWTDP.addFile(project.root))
      CAWTDP.refresh()
    })
}

/************************************************************************************
 * Export module
 ************************************************************************************/
const CAWWorkspace = {
  addProject,
  closeTextDocument,
  dispose,
  highlight,
  init,
  refreshActiveFile,
  setupSync,
  setupTempFiles,
}

export default CAWWorkspace
