import * as vscode from 'vscode'
import * as _ from 'lodash'

import { CΩStatusbar } from '@/vscode/statusbar'
import { setupCommands } from '@/vscode/commands'

import type { TCΩEditor } from '@/lib/cΩ.editor'

import { initConfig } from '@/lib/settings'
import { CΩStore } from '@/lib/cΩ.store'

import logger from '@/lib/logger'
import TDP from '@/lib/cΩ.tdp'
import CΩPanel from '@/lib/cΩ.panel'
import CΩEditor from '@/lib/cΩ.editor'
import CΩWorkspace from '@/lib/cΩ.workspace'
import CΩWS from '@/lib/cΩ.ws'

let activated: boolean // extension activated !
const deactivateTasks: Array<any> = [] // keeping track of all the disposables

export const SCM_PEER_FILES_VIEW = 'codeAwareness'

export function activate(context: vscode.ExtensionContext) {
  // The commandId parameter must match the command field in package.json
  initCodeAwareness(context)
}

// this method is called when your extension is deactivated
export function deactivate() {
  const promises = [
    CΩStatusbar.dispose(),
    CΩWorkspace.dispose(),
  ]

  for (const task of deactivateTasks) {
    promises.push(task())
  }

  logger.info('CODEAWARENESS_EXTENSION: extension deactivated')
  return Promise.all(promises)
}

function initCodeAwareness(context: vscode.ExtensionContext) {
  // TODO: when no projects / repos available we should skip init; at the moment we are getting "cannot read property 'document' of undefined
  activated = true
  console.log('Extension: initCodeAwareness')
  initConfig()
  CΩStore.ws = new CΩWS()
  CΩStatusbar.init()
  setupCommands(context)
  setupWatchers(context)
  logger.info('CODEAWARENESS_EXTENSION: extension activated (workspaceFolders)', vscode.workspace.workspaceFolders)
}

/************************************************************************************
 * Watch the workspace folder list, and register / unregister as projects.
 *
 * TDP: CodeAwareness Explorer panel: showing all files affected by changes at peers.
 * SCM: Source Control Manager: trying to use internal VSCode SCM here.
 ************************************************************************************/
function setupWatchers(context: vscode.ExtensionContext) {
  const { subscriptions } = context
  TDP.clearWorkspace()
  vscode.workspace.workspaceFolders?.map(folder => subscriptions.push(
      vscode.window.registerTreeDataProvider(SCM_PEER_FILES_VIEW, TDP.addPeerWorkspace(folder))
    ))
  // TODO: SCM files
  subscriptions.push(
    // vscode.workspace.registerTextDocumentContentProvider(CΩ_SCHEMA, CΩDocumentContentProvider)
  )
  // TODO: Code Lenses
  subscriptions.push(
    // peer8CodeLensProvider()
  )
  // Sync workspace folders
  subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(e => {
    if (!activated) initCodeAwareness(context)
    logger.info('CODEAWARENESS_EXTENSION: onDidChangeWorkspaceFolders (events)', e)
    // TODO: can we not mix promises and try catch?
    try {
      e.added.forEach(folder => {
        CΩWorkspace.addProject(folder.uri.path)
        vscode.window.registerTreeDataProvider(SCM_PEER_FILES_VIEW, TDP.addPeerWorkspace(folder))
      })
      e.removed.forEach(folder => {
        CΩWorkspace.removeProject(folder.uri.path)
        TDP.removePeerWorkspace(folder)
      })
    } catch (ex) {
      // showErrorMessage(ex.message)
    } finally {
      // e.removed.forEach(CΩSCM.removeProject)
    }
  }))

  /************************************************************************************
   * Color theme changes
   ************************************************************************************/
  subscriptions.push(vscode.window.onDidChangeActiveColorTheme(e => {
    CΩStore.colorTheme = e.kind
    const data = { colorTheme: e.kind }
    CΩPanel.postMessage({ command: 'setColorTheme', data })
  }))

  /************************************************************************************
   * User changing the code inside the activeTextEditor
   ************************************************************************************/
  const refreshLines = _.throttle(CΩWorkspace.refreshLines, 2000, { leading: false, trailing: true })
  subscriptions.push(vscode.workspace.onDidChangeTextDocument(params => {
    if (!CΩStore.activeTextEditor) return
    refreshLines(params)
  }))

  /************************************************************************************
   * User saving the activeTextEditor
   ************************************************************************************/
  subscriptions.push(vscode.workspace.onDidSaveTextDocument(e => {
    // TODO: some throttle mechanism to make sure we're only sending at most once per some configured interval (subscription plan related)
    // use delay to allow the system to do other things like build and stuff, and prevent excessive use (peaks) of CPU
    // TODO:
    /*
    CΩDiffs
      .sendDiffs(project)
      .then(CΩWorkspace.refreshChanges)
      */
  }))

  /************************************************************************************
   * User switching to a different file
   ************************************************************************************/
  vscode.window.onDidChangeActiveTextEditor((editor: vscode.TextEditor | undefined) => {
    logger.info('CODEAWARENESS_EXTENSION: onDidChangeActiveTextEditor', editor)
    if (!editor) return
    CΩEditor.setActiveEditor(editor as TCΩEditor)
    CΩStore?.ws?.rSocket?.transmit('repo:active-path', { fpath: editor.document.uri.path, doc: editor.document.getText() })
      .then(CΩEditor.updateDecorations)
  })

  /************************************************************************************
   * User closed a file (activeTextEditor)
   * VSCode does not properly notify us on closing a tab;
   * Also, when closing a Diff window, VSCode triggers this event for the original source file. (!)
   * TODO: find another workaround
   ************************************************************************************/
  subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(params => {
    if (!CΩStore.activeTextEditor) return
    CΩWorkspace.closeTextDocument(params)
  }))

  /************************************************************************************
   * initial SCM setup
   ************************************************************************************/
  const folders = vscode.workspace.workspaceFolders as vscode.WorkspaceFolder[]
  if (!folders) return

  /************************************************************************************
   * VSCode Telemetry
   * TODO: create ApplicationInsights Key for Telemetry
   ************************************************************************************/
  /*
  const { name, version, aiKey } = require('../package.json')
  const telemetryReporter = new TelemetryReporter(name, version, aiKey)
  logger.info('CODEAWARENESS_EXTENSION: deactivateTasks', deactivateTasks)
  deactivateTasks.push(() => telemetryReporter.dispose())
  */
}
