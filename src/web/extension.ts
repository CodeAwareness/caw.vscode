/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as vscode from 'vscode'
import * as _ from 'lodash'
import * as path from 'path'

import { CΩStatusbar } from '@/vscode/statusbar'
import { setupCommands } from '@/vscode/commands'

import type { TCΩEditor } from '@/lib/cΩ.editor'

import { initConfig } from '@/lib/settings'
import { CΩStore } from '@/lib/cΩ.store'

import config from '@/config'
import logger from '@/lib/logger'
import CΩPanel from '@/lib/cΩ.panel'
import CΩEditor from '@/lib/cΩ.editor'
import CΩWorkspace from '@/lib/cΩ.workspace'
import CΩWS from '@/lib/cΩ.ws'
import CΩTDP from '@/lib/cΩ.tdp'

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
    CΩStore.ws?.dispose(),
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
  logger.info('will initialize WSS')
  CΩStore.ws = new CΩWS()
  CΩStatusbar.init()
  setupCommands(context)
  setupWatchers(context)
  logger.info('CODEAWARENESS_EXTENSION: extension activated (workspaceFolders)', vscode.workspace.workspaceFolders)
}

const CΩDocumentContentProvider = {

  _onDidChange: new vscode.EventEmitter(),

  get onDidChange() {
    logger.info('peer8DocumentContentProvider onDidChange')
    return this._onDidChange.event
  },

  dispose() {
    logger.info('peer8DocumentContentProvider dispose')
    this._onDidChange.dispose()
  },

  updated(repo: any) {
    logger.info('peer8DocumentContentProvider updated', repo)
    // this._onDidChange.fire(Uri.parse(`${PEER8_SCHEMA}:src/extension.js`))
  },

  provideTextDocumentContent(relativePath: string) {
    // @ts-ignore
    const [, wsName, uri] = /([^/]+)\/(.+)$/.exec(relativePath.path)
    const { tmpDir, selectedContributor } = CΩStore
    const ctId = selectedContributor.user
    const userDir = path.join(tmpDir, ctId.toString(), wsName)
    const peerFile = path.join(userDir, config.EXTRACT_REPO_DIR, uri)
    // logger.info('peer8DocumentContentProvider uri', relativePath.path, 'peerFile', peerFile)

    return CΩStore.ws!.transmit('repo:read-file', { fpath: peerFile })
      // TODO: find a better way to indicate deleted file, as opposed to new file created, as opposed to simply file not existing
      .catch(() => '') // if file not existing
  },
}

/************************************************************************************
 * Watch the workspace folder list, and register / unregister as projects.
 *
 * TDP: CodeAwareness Explorer panel: showing all files affected by changes at peers.
 * SCM: Source Control Manager: trying to use internal VSCode SCM here.
 ************************************************************************************/
function setupWatchers(context: vscode.ExtensionContext) {
  const { subscriptions } = context
  CΩTDP.clearWorkspace()
  vscode.workspace.workspaceFolders?.map(wsFolder => subscriptions.push(
    vscode.window.registerTreeDataProvider(SCM_PEER_FILES_VIEW, CΩTDP.addPeerWorkspace(wsFolder))
  ))
  // TODO: SCM files
  subscriptions.push(
    /* @ts-ignore */
    vscode.workspace.registerTextDocumentContentProvider(config.CΩ_SCHEMA, CΩDocumentContentProvider)
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
      // TODO: cleanup this, we have calls to TDP and CSM from here, workspace and scm..
      e.added.forEach(wsFolder => {
        CΩWorkspace.addProject(wsFolder)
        vscode.window.registerTreeDataProvider(SCM_PEER_FILES_VIEW, CΩTDP.addPeerWorkspace(wsFolder))
      })
      e.removed.forEach(wsFolder => {
        CΩWorkspace.removeProject(wsFolder)
        CΩTDP.removePeerWorkspace(wsFolder)
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
  subscriptions.push(vscode.workspace.onDidSaveTextDocument((/* err */) => {
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
    logger.info('CODEAWARENESS_EXTENSION: onDidChangeActiveTextEditor (editor, cΩStore)', editor, CΩStore)
    if (!editor) return
    CΩEditor.setActiveEditor(editor as TCΩEditor)
    CΩStore.ws!.transmit('repo:active-path', { fpath: editor.document.uri.path, doc: editor.document.getText() })
      .then(CΩEditor.updateDecorations)
      .then(CΩTDP.addProject)
      .then(CΩPanel.updateProject)
      .then((project: any) => {
        Object.keys(project.changes).map((f: string) => CΩTDP.addFile(project.root, f))
        CΩTDP.refresh()
      })
  })

  /************************************************************************************
   * User closed a file (activeTextEditor)
   * VSCode does not properly notify us on closing a tab;
   * Also, when closing a Diff window, VSCode triggers this event for the original source file, not for the diff one. (!WTF...)
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

  logger.log('setup watchers complete.')
}
