/**************************************************************
 * Communication between VSCode extension and the webview panel
 **************************************************************/
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as vscode from 'vscode'

import type { TAuth } from './caw.store'

import { localize } from './locale'
import { CAWStore } from './caw.store'

import logger from './logger'
import CAWEditor from './caw.editor'
import CAWDeco from './caw.deco'
import CAWPanel from './caw.panel'
import CAWTDP from '@/lib/caw.tdp'
import CAWIPC from '@/lib/caw.ipc'
import CAWWorkspace from './caw.workspace'

/**
 * This is the VSCode <--> VSCode Webview Events module
 */
function init() {
  CAWStore.colorTheme = vscode.window.activeColorTheme.kind
  const data = { colorTheme: CAWStore.colorTheme }
  CAWPanel.postMessage({ command: 'setColorTheme', data })
}

const shortid = () => {
  const n = String.fromCharCode(Math.floor(Math.random() * 10 + 48))
  const l = String.fromCharCode(Math.floor(Math.random() * 26 + 97))
  const c = String.fromCharCode(Math.floor(Math.random() * 26 + 65))
  return l + c + n + new Date().valueOf().toString()
}

const postBack = (command: string, id?: string) => (data: any) => {
  CAWPanel.postMessage({ command, id, data })
}

const eventsTable: Record<string, any> = {}

eventsTable['webview:loaded'] = () => {
  console.log('Will init webview with GUID', CAWIPC.guid)
  postBack('wssGuid')(CAWIPC.guid)
  postBack('authInfo')({ user: CAWStore.user, tokens: CAWStore.tokens })
}

eventsTable['auth:login'] = (data: TAuth) => {
  init()
  CAWStore.user = data?.user
  CAWStore.tokens = data?.tokens
  if (data?.user) {
    CAWIPC.transmit('repo:active-path', {
      fpath: CAWStore.activeTextEditor?.document?.uri?.path,
      cid: CAWIPC.guid,
      doc: CAWStore.activeTextEditor?.document?.getText()
    })
      .then(CAWEditor.updateDecorations)
      .then(CAWTDP.addProject)
      .then(CAWPanel.updateProject)
      .then(CAWWorkspace.setupSync)
  }
}

eventsTable['auth:logout'] = () => {
  CAWStore.clear()
  CAWDeco.clear()
}

eventsTable['branch:select'] = (branch: string) => {
  const fpath = CAWStore.activeProject.activePath
  if (!fpath) return
  const origin = CAWStore.activeProject.origin
  CAWIPC.transmit('repo:diff-branch', { origin, branch, fpath })
    .then((info: any) => {
      const peerFileUri = vscode.Uri.file(info.peerFile)
      const userFileUri = vscode.Uri.file(info.userFile)
      // logger.info('OPEN DIFF with', info, fpath)
      vscode.commands.executeCommand('vscode.diff', userFileUri, peerFileUri, info.title, { viewColumn: 1, preserveFocus: true })
    })
}

eventsTable['branch:unselect'] = () => {
  CAWEditor.closeDiffEditor()
}

eventsTable['branch:refresh'] = (data: any) => {
  // TODO: refresh branches using git and display in CAWPanel
}

eventsTable['contrib:select'] = (contrib: any) => {
  const fpath = CAWStore.activeTextEditor?.document?.uri?.path
  if (!fpath) return
  const cid = CAWIPC.guid
  const origin = CAWStore.activeProject.origin
  CAWIPC.transmit('repo:diff-contrib', { origin, fpath, cid, contrib })
    .then((info: any) => {
      const peerFileUri = vscode.Uri.file(info.peerFile)
      const userFileUri = vscode.Uri.file(fpath)
      // logger.info('OPEN DIFF with', fpath, info)
      vscode.commands.executeCommand('vscode.diff', userFileUri, peerFileUri, info.title, { viewColumn: 1, preserveFocus: true })
    })
}

eventsTable['contrib:unselect'] = () => {
  CAWEditor.closeDiffEditor()
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
  CAWIPC.transmit(key, data)
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

const CAWEvents = {
  setup,
}

export default CAWEvents
