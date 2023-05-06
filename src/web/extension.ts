/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as vscode from 'vscode'
import * as path from 'node:path'

import { CAWStatusbar } from '@/vscode/statusbar'
import { setupCommands } from '@/vscode/commands'

import type { TCAWEditor } from '@/lib/caw.editor'

import { initConfig } from '@/lib/settings'
import { CAWStore } from '@/lib/caw.store'

import config from '@/config'
import logger from '@/lib/logger'
import CAWPanel from '@/lib/caw.panel'
import CAWEditor from '@/lib/caw.editor'
import CAWWorkspace from '@/lib/caw.workspace'
import CAWTDP from '@/lib/caw.tdp'
import CAWIPC from '@/lib/caw.ipc'

let activated: boolean // extension activated !
const deactivateTasks: Array<any> = [] // keeping track of all the disposables (TODO: cleanup)

export const SCM_PEER_FILES_VIEW = 'codeAwareness'

export const activate = initCodeAwareness

export function deactivate() {
  const promises = [
    CAWStatusbar.dispose(),
    CAWWorkspace.dispose(),
    CAWIPC.dispose(),
  ]

  for (const task of deactivateTasks) {
    promises.push(task())
  }

  logger.info('CodeAwareness: extension deactivated')
  return Promise.all(promises)
}

function initCodeAwareness(context: vscode.ExtensionContext) {
  // TODO: when no projects / repos available we should skip init; currently we are getting "cannot read property 'document' of undefined
  activated = true
  initConfig()
  CAWIPC.init()
  setupCommands(context)
  setupWatchers(context)
  logger.info('CodeAwareness: extension activated (workspaceFolders)', vscode.workspace.workspaceFolders)
}

const CAWDocumentContentProvider = {

  // Found this trick to transmit events between VSCode internals and our extension
  _onDidChange: new vscode.EventEmitter(),

  get onDidChange() {
    logger.info('CodeAwareness: cawDocumentContentProvider onDidChange')
    return this._onDidChange.event
  },

  dispose() {
    logger.info('CodeAwareness: cawDocumentContentProvider dispose')
    this._onDidChange.dispose()
  },

  updated(repo: any) {
    logger.info('CodeAwareness: cawDocumentContentProvider updated', repo)
    // this._onDidChange.fire(Uri.parse(`${CAW_SCHEMA}:src/extension.js`))
  },

  provideTextDocumentContent(relativePath: string) {
    // @ts-ignore
    const [, wsName, uri] = /([^/]+)\/(.+)$/.exec(relativePath.path)
    const { tmpDir, selectedContributor } = CAWStore
    const ctId = selectedContributor.user
    const userDir = path.join(tmpDir, ctId.toString(), wsName)
    const peerFile = path.join(userDir, config.EXTRACT_REPO_DIR, uri)
    // logger.info('CodeAwareness: cawDocumentContentProvider uri', relativePath.path, 'peerFile', peerFile)

    return CAWIPC.transmit('repo:read-file', { fpath: peerFile })
      // TODO: find a better way to indicate deleted file, as opposed to new file created, as opposed to simply file not existing
      .catch(() => '') // if file not existing
  },
}

/************************************************************************************
 * Watch the workspace folder list, and register / unregister as projects.
 *
 * TDP: Tree Data Provider: showing all files affected by changes at peers (left panel)
 * SCM: Source Control Manager: trying to use internal VSCode SCM here.
 ************************************************************************************/
function setupWatchers(context: vscode.ExtensionContext) {
  const { subscriptions } = context
  CAWTDP.clearWorkspace()
  vscode.workspace.workspaceFolders?.map(wsFolder => subscriptions.push(
    vscode.window.registerTreeDataProvider(SCM_PEER_FILES_VIEW, CAWTDP.addPeerWorkspace(wsFolder))
  ))
  // TODO: SCM files
  subscriptions.push(
    /* @ts-ignore */
    vscode.workspace.registerTextDocumentContentProvider(config.CAW_SCHEMA, CAWDocumentContentProvider)
  )
  // TODO: Code Lenses
  subscriptions.push(
    // cawCodeLensProvider()
  )
  // Sync workspace folders
  subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(e => {
    if (!activated) initCodeAwareness(context)
    logger.info('CodeAwareness: onDidChangeWorkspaceFolders (events)', e)
    try {
      e.added.forEach(wsFolder => {
        vscode.window.registerTreeDataProvider(SCM_PEER_FILES_VIEW, CAWTDP.addPeerWorkspace(wsFolder))
      })
      e.removed.forEach(wsFolder => {
        CAWTDP.removePeerWorkspace(wsFolder)
      })
    } catch (ex) {
      // showErrorMessage(ex.message)
    } finally {
      // e.removed.forEach(CAWSCM.removeProject)
    }
  }))

  /************************************************************************************
   * Color theme changes
   ************************************************************************************/
  subscriptions.push(vscode.window.onDidChangeActiveColorTheme(e => {
    CAWStore.colorTheme = e.kind
    const data = { colorTheme: e.kind }
    CAWPanel.postMessage({ command: 'setColorTheme', data })
  }))

  /************************************************************************************
   * User saving the activeTextEditor
   ************************************************************************************/
  subscriptions.push(vscode.workspace.onDidSaveTextDocument(doc => {
    // TODO: some throttle mechanism to make sure we're only sending at most once per some configured interval
    CAWIPC.transmit('repo:file-saved', { fpath: doc.fileName, doc: doc.getText(), cid: CAWIPC.guid })
      .then(CAWEditor.updateDecorations)
      .then(CAWPanel.updateProject)
      .then((project: any) => {
        Object.keys(project.changes).map(CAWTDP.addFile(project.root))
        CAWTDP.refresh()
      })
  }))

  /************************************************************************************
   * User switching to a different file
   ************************************************************************************/
  vscode.window.onDidChangeActiveTextEditor((editor: vscode.TextEditor | undefined) => {
    if (!editor) return
    CAWEditor.setActiveEditor(editor as TCAWEditor)
    CAWWorkspace.refreshActiveFile()
  })

  /************************************************************************************
   * User closed a file (activeTextEditor)
   * VSCode does not properly notify us on closing a tab;
   * Also, when closing a Diff window, VSCode triggers this event for the original source file, not for the diff one. (!WTF...)
   * TODO: find another workaround
   ************************************************************************************/
  subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(params => {
    if (!CAWStore.activeTextEditor) return
    CAWWorkspace.closeTextDocument(params)
  }))

  /************************************************************************************
   * initial SCM setup
   ************************************************************************************/
  const folders = vscode.workspace.workspaceFolders as vscode.WorkspaceFolder[]
  if (!folders) return
  // TODO: do we still need to do anything here?

  /************************************************************************************
   * VSCode Telemetry
   * TODO: create ApplicationInsights Key for Telemetry (Microsoft VSCode only)
   ************************************************************************************/
  /*
  const { name, version, aiKey } = require('../package.json')
  const telemetryReporter = new TelemetryReporter(name, version, aiKey)
  deactivateTasks.push(() => telemetryReporter.dispose())
  */

  logger.log('CodeAwareness: setup watchers complete.')
}
