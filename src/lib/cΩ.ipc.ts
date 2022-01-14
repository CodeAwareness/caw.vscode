import * as vscode from 'vscode'

import { logger } from './logger'
import { localize } from './locale'

import type { TAuth, TCredentials } from './cΩ.api'

import { CΩAPI } from './cΩ.api'
import { CΩStore } from './cΩ.store'
import { CΩEditor } from './cΩ.editor'
import { CΩDeco } from './cΩ.deco'
import { CΩDiffs } from './cΩ.diffs'
import { CΩPanel } from './cΩ.panel'
import { CΩWorkspace } from './cΩ.workspace'

function init() {
  CΩStore.colorTheme = vscode.window.activeColorTheme.kind
  if (CΩStore.tokens) {
    CΩWorkspace.syncProject()
  }
  const data = { colorTheme: CΩStore.colorTheme }
  CΩPanel.postMessage({ command: 'setColorTheme', data })
}

const postBack = (command: string) => (res: any) => {
  CΩPanel.postMessage({ command, res })
}

const ipcTable: Record<string, any> = {}

ipcTable['initialized'] = init

ipcTable['auth:login'] = (data: TCredentials) => {
  CΩAPI.login(data)
    .then((res: TAuth) => {
      init()
      CΩWorkspace.setupWorker()
      postBack('auth:login')
    })
}

ipcTable['auth:logout'] = (data: TCredentials) => {
  CΩAPI.logout()
  CΩDeco.clear()
}

ipcTable['auth:sendPass'] = (email: string) => {
  CΩAPI.sendPass(email).then(postBack('auth:sendPass'))
}

ipcTable['auth:register'] = (cred: TCredentials) => {
  CΩAPI.register(cred).then(postBack('auth:register'))
}

ipcTable['adhoc:receiveShared'] = (data: any) => {
  // TODO:
  // CΩWorkspace.receiveShared(data)
}
ipcTable['adhoc:shareFile'] = (data: any) => {
  // TODO:
  // CΩWorkspace.shareFile(data)
}

ipcTable['adhoc:shareFolder'] = (data: any) => {
  // TODO:
  // CΩWorkspace.shareFolder(data)
}

ipcTable['branch:select'] = (data: any) => {
  CΩDiffs.diffWithBranch(data)
}

ipcTable['branch:refresh'] = (data: any) => {
  // eslint-disable-next-line
  const promises = CΩStore.projects.map(p => p.repo.refreshGit())
  Promise.all(promises)
    .then(() => {
      CΩPanel.postMessage({
        command: 'branch:refresh',
        data: CΩStore.activeProject?.repo.git,
      })
    })
}

ipcTable['branch:unselect'] = () => {
  CΩStore.selectedBranch = undefined
  CΩEditor.closeDiffEditor()
}

ipcTable['contrib:select'] = () => {
  CΩDiffs.diffWithContributor()
}

ipcTable['contrib:unselect'] = () => {
  CΩStore.selectedContributor = undefined
  CΩEditor.closeDiffEditor()
}

ipcTable['repo:updateAvailable'] = (data: any) => {
  logger.log('IPC: repo:updateAvailable', data)
  if (!CΩStore.activeProject) return
  // eslint-disable-next-line
  const { activePath } = CΩStore.activeProject
  /* swarm auth success will trigger repo:updateAvailable with no activePath (complete refresh) */
  if (!data.activePath || activePath === data.activePath) CΩWorkspace.refreshChanges(activePath)
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
 * setupIPC
 *
 * @param object - webview: the webview object
 * @param object - context: used for continuation of subscriptions
 ************************************************************************************/
function setupIPC(webview: any, context: any) {
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

export const CΩIPC = {
  setupIPC,
}
