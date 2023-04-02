/**********************
 * VSCode Webview Panel
 **********************/
import * as vscode from 'vscode'
import * as path from 'node:path'

import config from '@/config'
import logger from './logger'

import { CAWStore } from './caw.store'

import CAWEvents from './caw.events'
import CAWWorkspace from './caw.workspace'
import CAWEditor from './caw.editor'

let panelColumn: vscode.ViewColumn = vscode.ViewColumn.Two

function getPanel() {
  return CAWStore.panel
}

function hasPanel() {
  return !!CAWStore.panel
}

function dispose() {
  if (CAWStore.panel) {
    CAWWorkspace.dispose()
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
  CAWStore.panel = vscode.window.createWebviewPanel(
    'codeAwareness',
    'Code Awareness',
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

  return CAWStore.panel
}

/************************************************************************************
 * toggle CodeAwareness panel on and off
 *
 * When toggling the CodeAwareness webview panel on and off,
 * we load the svelte app into the webview and show or hide the panel.
 *
 * @param context vscode.ExtensionContext - context object from VSCode
 *
 ************************************************************************************/
function toggle(context: vscode.ExtensionContext) {
  const { extensionPath } = context
  let panel = CAWStore.panel

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

  if (config.DEBUG) getWebviewContentLocal(panel.webview) // DEV
  else getWebviewContent(panel.webview) // PRODUCTION

  CAWEditor.focusTextEditor()
  console.log('VSCODE will setup IPC with panel loaded from:', config.EXT_URL)
  CAWEvents.setup(panel.webview, context)
  panel.onDidDispose(dispose, undefined, context.subscriptions)
  panel.onDidChangeViewState((state: vscode.WindowState) => CAWPanel.didChangeViewState(state), undefined, context.subscriptions)
  return true
}

function getNonce() {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

function getWebviewContent(webview: vscode.Webview) {
  const nonce = getNonce()
  const cspSource = 'https://vscode.codeawareness.com https://api.codeawareness.com'
  const mediaSource = 'https://codeawareness.com https://ext.codeawareness.com'
  // TODO: everytime i publish the CAW Panel it builds a new chunk hash, try to make this pain go away without introducing cache headaches
  webview.html = `<!doctype html><html lang="en"><head><meta charset="UTF-8">
    <title>CodeAwareness VSCode panel</title>
    <meta http-equiv="Content-Security-Policy" content="default-src ${cspSource}; style-src ${cspSource} 'unsafe-inline'; img-src ${cspSource} ${mediaSource}; script-src 'nonce-${nonce}';">
    <script defer="defer" nonce="${nonce}" src="https://vscode.codeawareness.com/runtime.js"></script>
    <script defer="defer" nonce="${nonce}" src="https://vscode.codeawareness.com/110.js?t=${new Date().valueOf()}"></script>
    <script defer="defer" nonce="${nonce}" src="https://vscode.codeawareness.com/main.js?t=${new Date().valueOf()}"></script>
    <link nonce="${nonce}" href="https://vscode.codeawareness.com/main.css" rel="stylesheet"></head>
    <body>
      <h1 id="panelLoading">Loading...</h1>
      <script defer nonce="${nonce}" src="https://vscode.codeawareness.com/main.js?t=${new Date().valueOf()}"></script>
    </body></html>`
}

async function getWebviewContentLocal(webview: vscode.Webview) {
  // webview.html = (await got('https://127.0.0.1:8885')).body

  const nonce = getNonce()
  const cspSource = 'https://127.0.0.1:8885'
  const mediaSource = 'https://codeawareness.com https://ext.codeawareness.com'
  webview.html = `<!doctype html><html lang="en"><head><meta charset="UTF-8">
    <title>CodeAwareness VSCode panel</title>
    <meta http-equiv="Content-Security-Policy" content="default-src ${cspSource}; style-src ${cspSource} 'unsafe-inline'; img-src ${cspSource} ${mediaSource}; script-src 'nonce-${nonce}' 'unsafe-eval';">
    <script defer="defer" nonce="${nonce}" src="https://127.0.0.1:8885/main.js?t=${new Date().valueOf()}"></script>
    <body>
      <h1 id="panelLoading">Loading...</h1>
    </body></html>`
}

/************************************************************************************
 * post a message back to VSCode API
 *
 * @param data Object - data to be sent to the webview
 ************************************************************************************/
function postMessage(data: any) {
  if (CAWStore.panel) {
    logger.info('PANEL postMessage', JSON.stringify(data))
    CAWStore.panel.webview.postMessage(data)
  }
}

/************************************************************************************
 * ensure we're not focusing the caw panel
 *
 * We have to find a way to avoid opening a file in the same window group as the webview.
 * From what I could find, VSCode does not provide any means to doing that,
 * so I'm instead using this trick, of moving the code to the left.
 * (sorry for those people with portrait monitors... I'll figure something out later)
 *
 * @param state Object - the state object received from VSCode API
 *
 ************************************************************************************/
function didChangeViewState(state: any) {
  logger.info('PANEL didChangeViewState', state)
  if (hasPanel()) {
    moveEditor(state.webviewPanel)
  }
}

/************************************************************************************
 * update contributor information
 *
 * We have to find a way to avoid opening a file in the same window group as the webview.
 * From what I could find, VSCode does not provide any means to doing that,
 * so I'm instead using this trick, of moving the code to the left.
 * (sorry for those people with portrait monitors... I'll figure something out later)
 *
 * @param data Object - the project (received from VSCode API)
 *
 ************************************************************************************/
function updateProject(project: any) {
  postMessage({ command: 'setProject', data: project })
  return project
}

const CAWPanel = {
  createPanel,
  didChangeViewState,
  dispose,
  getPanel,
  hasPanel,
  postMessage,
  toggle,
  updateProject,
}

export default CAWPanel
