import * as _ from 'lodash'
import { basename } from 'path'

import { registerCommand, executeCommand, getWorkspaceFolder, uriFile, uriFromPath } from './vscode'

import { logger } from '@/lib/logger'
import { EXTRACT_PEER_DIR } from '@/config'

import { CΩPanel     } from '@/lib/cA.panel'
import { CΩDiffs     } from '@/lib/cA.diffs'

function setupCommands(context) {
  context.subscriptions.push(registerCommand('CΩ.toggle', function() {
    CΩPanel.toggle(context)
  }))

  context.subscriptions.push(registerCommand('CΩ.highlight', function() {
    logger.log('COMMAND: highlight request received')
  }))

  context.subscriptions.push(registerCommand('CΩ.nextContributor', function() {
    CΩDiffs.cycleContribution()
  }))

  context.subscriptions.push(registerCommand('CΩ.prevContributor', function() {
    CΩDiffs.cycleContribution(true)
  }))

  context.subscriptions.push(registerCommand('CΩ.nextContribution', function(...rest) {
    logger.log('COMMAND: nextContribution request received', rest)
  }))

  context.subscriptions.push(registerCommand('CΩ.prevContribution', function(...rest) {
    logger.log('COMMAND: prevContribution request received', rest)
  }))

  context.subscriptions.push(registerCommand('CΩ.mergeSlice', function(...rest) {
    logger.log('COMMAND: mergeSlice request received', rest)
    CΩDiffs.mergeSlice()
  }))

  context.subscriptions.push(registerCommand('CΩ.mergeAll', function() {
    logger.log('COMMAND: mergeAll request received')
  }))

  context.subscriptions.push(registerCommand('CΩ.openPeerFile', function(wsFolder, fpath, uid) {
    logger.log('COMMAND: openPeerFile request received')
  }))

  context.subscriptions.push(registerCommand('CΩ.openDiff', function(resourceUri, cdir, cfile, title) {
    logger.log('COMMAND: openDiff request received')
  }))

  context.subscriptions.push(registerCommand('CΩ.refresh', function() {
    logger.log('COMMAND: refresh request received')
  }))

  context.subscriptions.push(registerCommand('CΩ.openFile', function({ resourceUri }, ...rest) {
    logger.log('COMMAND: openFile request received', resourceUri, rest)
    executeCommand('vscode.open', resourceUri)
  }))

  context.subscriptions.push(registerCommand('CΩ.selectRange', function() {
    logger.log('COMMAND: selectRange request received')
  }))
}

export {
  setupCommands,
}
