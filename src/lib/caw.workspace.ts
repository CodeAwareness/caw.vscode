/**************************
 * Code Awareness workspace
 **************************/
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import logger from './logger'

import type { TProject } from './caw.store'

import { CAWStore, CAWWork } from './caw.store'

import CAWEditor from './caw.editor'
import CAWSCM from './caw.scm'
import CAWIPC from './caw.ipc'
import CAWPanel from '@/lib/caw.panel'
import CAWTDP from '@/lib/caw.tdp'
import { Position, Range /*, CodeActionTriggerKind */ } from 'vscode'

// TODO: this doesn't quite work...
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
function addProject(project: TProject) {
  logger.log('WORKSPACE: addProject', project)
  CAWSCM.addProject(project)
  CAWTDP.addProject(project)
  CAWStore.activeProject = project
  return project
}

function refreshActiveFile() {
  console.log('refreshing active file')
  if (!CAWStore.activeTextEditor) { console.log('no active text editor'); return }

  return CAWIPC.transmit<TProject>('repo:active-path', { fpath: CAWStore.activeTextEditor.document.uri.path, cid: CAWIPC.guid, doc: CAWStore.activeTextEditor.document.getText() })
    .then(addProject)
    .then(CAWEditor.updateDecorations)
    .then(CAWPanel.updateProject)
    .then((project: any) => {
      Object.keys(project.changes).map(CAWTDP.addFile(project.root))
      CAWTDP.refresh()
    })
}

export type TDiffBlock = {
  range: {
    line: number
    len: number
    content: string[]
  }
  replaceLen: number
}

function cycleContribution(direction: number) {
  if (!CAWStore.activeTextEditor) { console.log('no active text editor'); return }

  CAWIPC.transmit<TDiffBlock>('repo:cycle-contrib', {
    cid: CAWIPC.guid,
    origin: CAWStore.activeProject.origin,
    fpath: CAWStore.activeTextEditor.document.uri.path,
    doc: CAWStore.activeTextEditor.document.getText(),
    line: CAWStore.activeTextEditor.selections[0].active.line + 1,
    direction,
  })
    .then(data => {
      console.log('CYCLE RESPONSE', data)
      const editor = CAWStore.activeTextEditor
      if (!data?.range || !editor) return
      const start = new Position((data.range.line || 1) - 1, 0)
      const end = editor.document.lineAt((data.range.line + data.range.len)).range.end
      const content = data.range.content.join('\n') // TODO: what about Windows platform?

      editor
        .edit(editBuilder => {
          if (data.replaceLen && !data.range.len) {
            const insStart = new Position(data.range.line, 0)
            editBuilder.insert(insStart, content + '\n')
          } else if (!data.replaceLen) {
            const delEnd = new Position((data.range.line || 1) + data.range.len - 1, 0)
            editBuilder.delete(new Range(start, delEnd))
          } else {
            editBuilder.replace(new Range(start, end), content)
          }
        })
        .then(applied => {
          // if (applied) refreshActiveFile()
        })
    })
}

/************************************************************************************
 * Export module
 ************************************************************************************/
const CAWWorkspace = {
  addProject,
  closeTextDocument,
  cycleContribution,
  dispose,
  highlight,
  init,
  refreshActiveFile,
  setupSync,
  setupTempFiles,
}

export default CAWWorkspace
