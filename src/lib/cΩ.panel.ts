import axios from 'axios'
import * as vscode from 'vscode'
import * as path from 'path'

import { EXT_URL } from '@/config'
import { logger } from './logger'
import { locale } from './locale'

import { CΩStore } from './cΩ.store'
import { CΩWorkspace } from './cΩ.workspace'
import { CΩEditor } from './cΩ.editor'

let panelColumn: vscode.ViewColumn = vscode.ViewColumn.Two

function getPanel() {
  return CΩStore.panel
}

function hasPanel() {
  // console.log('trying to access PANEL', !!CΩStore.panel, this)
  return !!CΩStore.panel
}

function dispose() {
  if (CΩStore.panel) {
    CΩWorkspace.syncProject()
    CΩWorkspace.dispose()
  }
}

let editorMoveToggle = 1
function moveEditor(webviewPanel: vscode.WebviewPanel) {
  panelColumn = webviewPanel.viewColumn || vscode.ViewColumn.Two
  if (!webviewPanel.active && editorMoveToggle++ % 2) {
    const to = webviewPanel.viewColumn === vscode.ViewColumn.One ? 'last' : 'first'
    vscode.commands.executeCommand('moveActiveEditor', { to, by: 'group' })
  }
}

function createPanel(extensionPath: string) {
  CΩStore.panel = vscode.window.createWebviewPanel(
    'codeAwareness',
    'codeAwareness',
    panelColumn,
    {
      retainContextWhenHidden: true,
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(extensionPath, 'media')),
        vscode.Uri.file(path.join(extensionPath, 'out')),
      ],
    },
  )

  return CΩStore.panel
}

/************************************************************************************
 * toggle
 *
 * @param Object - context object from VSCode
 *
 * When toggling the CodeAwareness webview panel on and off,
 * we load the svelte app into the webview and show or hide the panel.
 ************************************************************************************/
function toggle(context: vscode.ExtensionContext) {
  const { extensionPath } = context
  let panel = CΩStore.panel

  if (panel && !panel.visible) {
    panel.reveal()
    return
  }

  if (panel && panel.visible) {
    return setTimeout(dispose, 100)
  }

  if (!panel) {
    panel = createPanel(extensionPath)
  }

  if (!panel.webview) return

  return getWebviewContent(panel.webview, EXT_URL)
    .then(() => {
      CΩEditor.focusTextEditor()
      panel.onDidDispose(dispose, undefined, context.subscriptions)
      panel.onDidChangeViewState((state: vscode.WindowState) => CΩPanel.didChangeViewState(state), undefined, context.subscriptions)
    })
}

axios.defaults.adapter = require('axios/lib/adapters/http')
const axiosEXT = axios.create({ baseURL: EXT_URL })

function getWebviewContent(webview: vscode.Webview, extURL: string) {
  webview.html = '<h1>Loading...</h1>'
  return axiosEXT.get(extURL + `/index.${locale}.html`)
    .then(response => (webview.html = response.data))
    .catch(err => {
      webview.html = '<h1>Offline</h1><p>You are either offline or the CodeAwareness server is down</p></h1>'
      logger.error('PANEL getWebviewContent error', err)
    })
}

/************************************************************************************
 * postMessage
 *
 * @param Object - data to be sent to the webview
 ************************************************************************************/
function postMessage(data: any) {
  if (CΩStore.panel) {
    logger.info('PANEL postMessage', JSON.stringify(data))
    CΩStore.panel.webview.postMessage(data)
  }
}

/************************************************************************************
 * didChangeViewState
 *
 * @param Object - the state object received from VSCode API
 *
 * We have to find a way to avoid opening a file in the same window group as the webview.
 * From what I could find, VSCode does not provide any means to doing that,
 * so I'm instead using this trick, of moving the code to the left.
 * (sorry for those people with portrait monitors... I'll figure something out later)
 ************************************************************************************/
function didChangeViewState(state: any) {
  logger.log('PANEL didChangeViewState', state)
  if (hasPanel()) {
    moveEditor(state.webviewPanel)
  }
}

export const CΩPanel = {
  createPanel,
  didChangeViewState,
  dispose,
  getPanel,
  hasPanel,
  postMessage,
  toggle,
}
