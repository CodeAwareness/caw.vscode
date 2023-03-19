/**************************************************************
 * Communication between VSCode extension and the webview panel
 **************************************************************/
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as vscode from 'vscode'

import type { TAuth } from './cΩ.store'

import { localize } from './locale'
import { CΩStore } from './cΩ.store'

import logger from './logger'
import CΩEditor from './cΩ.editor'
import CΩDeco from './cΩ.deco'
import CΩPanel from './cΩ.panel'
import CΩWorkspace from './cΩ.workspace'
import CΩTDP from '@/lib/cΩ.tdp'
import CΩIPC from '@/lib/cΩ.ipc'

/**
 * This is the VSCode <--> VSCode Webview Events module
 */
function init() {
  CΩStore.colorTheme = vscode.window.activeColorTheme.kind
  const data = { colorTheme: CΩStore.colorTheme }
  CΩPanel.postMessage({ command: 'setColorTheme', data })
}

const shortid = () => {
  const n = String.fromCharCode(Math.floor(Math.random() * 10 + 48))
  const l = String.fromCharCode(Math.floor(Math.random() * 26 + 97))
  const c = String.fromCharCode(Math.floor(Math.random() * 26 + 65))
  return l + c + n + new Date().valueOf().toString()
}

const postBack = (command: string, id?: string) => (data: any) => {
  CΩPanel.postMessage({ command, id, data })
}

const eventsTable: Record<string, any> = {}

eventsTable['webview:loaded'] = () => {
  console.log('Will init webview with GUID', CΩIPC.guid)
  postBack('wssGuid')(CΩIPC.guid)
  postBack('authInfo')({ user: CΩStore.user, tokens: CΩStore.tokens })
}

eventsTable['auth:login'] = (data: TAuth) => {
  init()
  CΩStore.user = data?.user
  CΩStore.tokens = data?.tokens
  if (data?.user) {
    CΩWorkspace.setupWorker()
    CΩIPC.transmit('repo:active-path', {
      fpath: CΩStore.activeTextEditor?.document?.uri?.path,
      doc: CΩStore.activeTextEditor?.document?.getText()
    })
      .then(CΩEditor.updateDecorations)
      .then(CΩTDP.addProject)
      .then(CΩPanel.updateProject)
  }
}

eventsTable['auth:logout'] = () => {
  CΩStore.clear()
  CΩDeco.clear()
}

eventsTable['branch:select'] = (branch: string) => {
  const fpath = CΩStore.activeProject.activePath
  if (!fpath) return
  const origin = CΩStore.activeProject.origin
  CΩIPC.transmit('repo:diff-branch', { origin, branch, fpath })
    .then((info: any) => {
      const peerFileUri = vscode.Uri.file(info.peerFile)
      const userFileUri = vscode.Uri.file(info.userFile)
      // logger.info('OPEN DIFF with', info, fpath)
      vscode.commands.executeCommand('vscode.diff', userFileUri, peerFileUri, info.title, { viewColumn: 1, preserveFocus: true })
    })
}

eventsTable['branch:unselect'] = () => {
  CΩEditor.closeDiffEditor()
}

eventsTable['branch:refresh'] = (data: any) => {
  // TODO: refresh branches using git and display in CΩPanel
}

eventsTable['contrib:select'] = (contrib: any) => {
  const fpath = CΩStore.activeTextEditor?.document?.uri?.path
  if (!fpath) return
  const origin = CΩStore.activeProject.origin
  CΩIPC.transmit('repo:diff-contrib', { origin, fpath, contrib })
    .then((info: any) => {
      const peerFileUri = vscode.Uri.file(info.peerFile)
      const userFileUri = vscode.Uri.file(fpath)
      // logger.info('OPEN DIFF with', fpath, info)
      vscode.commands.executeCommand('vscode.diff', userFileUri, peerFileUri, info.title, { viewColumn: 1, preserveFocus: true })
    })
}

eventsTable['contrib:unselect'] = () => {
  CΩEditor.closeDiffEditor()
}

/************************************************************************************
 * @param string - key: the event key, indicating an action to be taken
 * @param object - data: the data to be processed inside the action
 ************************************************************************************/
function processSystemEvent(key: string, data: any) {
  logger.info('EVENTS processSystemEvent', key, data)
  if (eventsTable[key]) eventsTable[key](data)
}

/************************************************************************************
 * @param string - key: the event key, indicating an action to be taken,
 * plus a unique ID to keep the req-res correlation.
 * For example, key can be: `auth:info:1kG9`
 * @param object - data: the data to be processed inside the action
 ************************************************************************************/
function processAPI(id: string, key: string, data: any) {
  logger.info('EVENTS processAPI', key, data)
  CΩIPC.transmit(key, data)
    .then(data => {
      const body = typeof data === 'string' ? JSON.parse(data) : data
      postBack(`res:${key}`, id)(body)
    })
    .catch(err => {
      const obj = typeof err === 'string' ? JSON.parse(err) : err
      postBack(`err:${key}`, id)(obj)
    })
}

/************************************************************************************
 * @param object - webview: the webview object
 * @param object - context: used for continuation of subscriptions
 ************************************************************************************/
function setup(webview: any, context: any) {
  webview.onDidReceiveMessage(
    (message: any) => {
      switch (message.command) {
        case 'api':
          // system events to sync day>ta between editor and webview
          processAPI(message.id, message.key, message.data)
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

const CΩEvents = {
  setup,
}

export default CΩEvents
