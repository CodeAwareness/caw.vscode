import * as vscode from 'vscode'

import type { TAuth } from './cΩ.store'

import { localize } from './locale'
import { CΩStore } from './cΩ.store'

import logger from './logger'
import CΩEditor from './cΩ.editor'
import CΩDeco from './cΩ.deco'
import CΩDiffs from './cΩ.diffs'
import CΩPanel from './cΩ.panel'
import CΩWorkspace from './cΩ.workspace'
import CΩWS from './cΩ.ws'

function init() {
  CΩStore.colorTheme = vscode.window.activeColorTheme.kind
  if (CΩStore.tokens) {
    CΩWorkspace.syncProject()
  }
  const data = { colorTheme: CΩStore.colorTheme }
  CΩPanel.postMessage({ command: 'setColorTheme', data })
}

const postBack = (command: string) => (data: any) => {
  CΩPanel.postMessage({ command, data })
}

const ipcTable: Record<string, any> = {}

ipcTable['auth:login'] = (data: TAuth) => {
  init()
  CΩStore.user = data?.user
  CΩStore.tokens = data?.tokens
  if (data?.user) {
    CΩWorkspace.setupWorker()
    CΩStore?.ws?.rSocket?.transmit('repo:active-path', {
      fpath: CΩStore.activeTextEditor?.document?.uri?.path,
      doc: CΩStore.activeTextEditor?.document?.getText()
    })
  }
}

ipcTable['auth:logout'] = () => {
  CΩStore.clear()
  CΩDeco.clear()
}

ipcTable['branch:select'] = (data: any) => {
  // TODO: CΩDiffs.diffWithBranch(data)
}

ipcTable['branch:refresh'] = (data: any) => {
  // refresh branches using git and display in CΩPanel
}

ipcTable['branch:unselect'] = () => {
  CΩEditor.closeDiffEditor()
}

ipcTable['contrib:select'] = () => {
  // TODO: CΩDiffs.diffWithContributor()
}

ipcTable['contrib:unselect'] = () => {
  CΩEditor.closeDiffEditor()
}

/************************************************************************************
 * processSystemEvent
 *
 * @param string - key: the event key, indicating an action to be taken
 * @param object - data: the data to be processed inside the action
 ************************************************************************************/
function processSystemEvent(key: string, data: any) {
  logger.info('IPC processSystemEvent', key, data)
  if (ipcTable[key]) ipcTable[key](data)
}

/************************************************************************************
 * setup
 *
 * @param object - webview: the webview object
 * @param object - context: used for continuation of subscriptions
 ************************************************************************************/
function setup(webview: any, context: any) {
  postBack('wss-guid')(CΩStore.ws?.guid) // TODO: exponential delay checking until .ws exists
  webview.onDidReceiveMessage(
    (message: any) => {
      switch (message.command) {
        case 'api':
          // system events to sync day>ta between editor and webview
          processSystemEvent(message.key, message.data)
          break

        case 'event':
          // system events to sync data between editor and webview
          processSystemEvent(message.key, message.data)
          break

        case 'alert':
          vscode.window.showErrorMessage(message.text)
          break

        case 'notification':
          vscode.window.showInformationMessage(localize(message.localeKey, message.text))
          break
      }
    },
    undefined,
    context.subscriptions,
  )
}

const CΩIPC = {
  setup,
}

export default CΩIPC
