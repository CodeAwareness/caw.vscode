/**************************
 * Code Awareness workspace
 **************************/
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import logger from './logger'

import { CAWStore, CAWWork } from './caw.store'

import type { TCAWEditor } from './caw.editor'

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
  refresh: refreshProject,
}

function init(data?: any) {
  console.log('Workspace: init', data)
  if (data?.user) {
    CAWStore.user = data.user
    CAWStore.tokens = data.tokens
    CAWDiffs.init()
    setupSync()
  }
  return setupTempFiles()
}

function dispose() {
  logger.info('WORKSPACE: dispose')
  // TODO: cleanup temp files
  if (CAWWork.syncTimer) clearInterval(CAWWork.syncTimer)
  CAWStore.panel?.dispose()
  CAWStore.panel = undefined
  CAWEditor.updateDecorations(CAWStore.activeProject)
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

/************************************************************************************
 * Close text document
 *
 * (cleanup)
 ************************************************************************************/
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

const getCode = (editor: TCAWEditor) => editor?.document.getText()

function saveCode() {
  if (!CAWStore.activeTextEditor) return Promise.reject(new Error('No active editor')) // TODO:
  const existingCode = getCode(CAWStore.activeTextEditor)
  // TODO:
  return Promise.resolve()
}

function getSavedCode() {
  // TODO: return readFile(_tmpFile).catch(err => null && err)
}

// TODO: add heartbeat so that we can clean up duplicate projects (which accumulate on Local Service due to restarting VSCode)
async function addProject(wsFolder: any) {
  const folder: string = wsFolder.uri ? wsFolder.uri.path : wsFolder.toString()
  logger.log('WORKSPACE: addProject', folder)

  CAWIPC.transmit('repo:add', { folder })
    .then(() => {
      CAWSCM.addProject(wsFolder)
      logger.info('WORKSPACE: Folder added to workspace: ', folder)
    })

  CAWIPC.transmit('repo:add-submodules', { folder })
    .then((subs: any) => {
      subs?.map((p: any) => CAWSCM.addProject(p))
      logger.info('WORKSPACE: Folder submodules added to workspace: ', subs)
    })
}

function removeProject(wsFolder: any) {
  const folder: string = wsFolder.uri ? wsFolder.uri.path : wsFolder.toString()

  CAWIPC.transmit('repo:remove', { folder })
    .then(() => {
      logger.info('WORKSPACE: Folder removed from workspace: ', folder)
    })
}

function refreshProject(data: any) {
  console.log('refreshing project', data.root)
  const project = CAWStore.projects.filter(p => p.root === data.root)[0]
  if (!project) return
  CAWEditor.updateDecorations(project)
  CAWPanel.updateProject(project)
  Object.keys(project.changes).map(CAWTDP.addFile(project.root))
  CAWTDP.refresh()
}

/************************************************************************************
 * Export module
 ************************************************************************************/
const CAWWorkspace = {
  addProject,
  closeTextDocument,
  dispose,
  getSavedCode,
  highlight,
  init,
  removeProject,
  saveCode,
  setupSync,
  setupTempFiles,
}

export default CAWWorkspace
