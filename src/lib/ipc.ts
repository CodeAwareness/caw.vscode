import { activeColorTheme, showErrorMessage, showInformationMessage } from '../vscode/vscode'

import { logger } from './logger'
import { localize } from './locale'

import { CΩStore } from './cΩ.store'
import { CΩEditor } from './cΩ.editor'
import { CΩDeco } from './cΩ.deco'
import { CΩDiffs } from './cΩ.diffs'
import { CΩPanel } from './cΩ.panel'
import { CΩWorkspace } from './cΩ.workspace'

/************************************************************************************
 * processSystemEvent
 *
 * @param string - key: the event key, indicating an action to be taken
 * @param object - data: the data to be processed inside the action
 ************************************************************************************/
function processSystemEvent(key: string, data: any) {
  logger.info('IPC processSystemEvent', key, data)
  function init(tokens?: any) {
    CΩStore.colorTheme = activeColorTheme
    const tk = tokens || CΩStore.tokens
    if (tk) CΩWorkspace.setupAuth(tk)
    if (!tokens && tk) {
      CΩWorkspace.syncProject()
    }
    const data = { colorTheme: activeColorTheme }
    CΩPanel.postMessage({ command: 'setColorTheme', data })
  }

  switch (key) {
    case 'initialized':
      init()
      break

    case 'adhoc:receiveShared':
      CΩWorkspace.receiveShared(data)
      break

    case 'adhoc:shareFile':
      CΩWorkspace.shareFile(data)
      break

    case 'adhoc:shareFolder':
      CΩWorkspace.shareFolder(data)
      break

    case 'branch:select':
      CΩDiffs.diffWithBranch(data)
      break

    case 'branch:refresh': {
      const promises = CΩStore.projects.map(p => p.repo.refreshGit())
      Promise.all(promises)
        .then(() => {
          CΩPanel.postMessage({
            command: 'setBranches',
            data: CΩStore.activeProject.repo.git,
          })
        })
    }
      break

    case 'branch:unselect':
      CΩStore.selectedBranch = undefined
      CΩEditor.closeDiffEditor()
      break

    case 'contrib:select':
      CΩDiffs.diffWithContributor(data)
      break

    case 'contrib:unselect':
      CΩStore.selectedContributor = undefined
      CΩEditor.closeDiffEditor()
      break

    case 'repo:updateAvailable': {
      logger.log('IPC: repo:updateAvailable', data)
      if (!CΩStore.activeProject) return
      const { activePath } = CΩStore.activeProject
      /* swarm auth success will trigger repo:updateAvailable with no activePath (complete refresh) */
      if (!data.activePath || activePath === data.activePath) CΩWorkspace.refreshChanges(activePath)
    }
      break

    case 'user:login':
      CΩStore.user = data.user
      CΩStore.tokens = data.tokens
      init(data.tokens)
      CΩWorkspace.setupWorker()
      break

    case 'user:logout':
      CΩStore.user = undefined
      CΩStore.tokens = undefined
      CΩDeco.clear()
      break
  }
}

/************************************************************************************
 * setupIPC
 *
 * @param object - webview: the webview object
 * @param object - context: used for continuation of subscriptions
 ************************************************************************************/
function setupIPC(webview, context) {
  webview.onDidReceiveMessage(
    message => {
      switch (message.command) {
        case 'event':
          // system events to sync data between editor and webview
          processSystemEvent(message.key, message.data)
          break

        case 'alert':
          showErrorMessage(message.text)
          break

        case 'notification':
          showInformationMessage(localize(message.localeKey, message.text), 4000)
          break
      }
    },
    undefined,
    context.subscriptions,
  )
}

export {
  setupIPC,
}
