import * as vscode from 'vscode'
import * as _ from 'lodash'

import logger from '@/lib/logger'

import CΩPanel from '@/lib/cΩ.panel'
import CΩDiffs from '@/lib/cΩ.diffs'
import CΩStore from '@/lib/cΩ.store'

const { registerCommand } = vscode.commands

function setupCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(registerCommand('CΩ.toggle', function() {
    CΩPanel.toggle(context)
  }))

  context.subscriptions.push(registerCommand('CΩ.highlight', function() {
    logger.log('COMMAND: highlight request received')
  }))

  context.subscriptions.push(registerCommand('CΩ.nextContributor', function() {
    // CΩDiffs.cycleContribution()
  }))

  context.subscriptions.push(registerCommand('CΩ.prevContributor', function() {
    // CΩDiffs.cycleContribution(true)
  }))

  context.subscriptions.push(registerCommand('CΩ.nextContribution', function(...rest) {
    logger.log('COMMAND: nextContribution request received', rest)
  }))

  context.subscriptions.push(registerCommand('CΩ.prevContribution', function(...rest) {
    logger.log('COMMAND: prevContribution request received', rest)
  }))

  context.subscriptions.push(registerCommand('CΩ.mergeSlice', function(...rest) {
    logger.log('COMMAND: mergeSlice request received', rest)
    // CΩDiffs.mergeSlice()
  }))

  context.subscriptions.push(registerCommand('CΩ.mergeAll', function() {
    logger.log('COMMAND: mergeAll request received')
  }))

  context.subscriptions.push(registerCommand('CΩ.openPeerFile', function(wsFolder, fpath, uid) {
    logger.log('COMMAND: openPeerFile request received', wsFolder, fpath)
    CΩStore.ws!
      .transmit('repo:vscode-diff', { wsFolder, fpath, uid })
      .then((data: any) => {
        if (data.exists) {
          const resourceUri = vscode.Uri.file(data.res1)
          vscode.commands.executeCommand('vscode.open', resourceUri)
        } else {
          const res1 = vscode.Uri.file(data.res1)
          const res2 = vscode.Uri.file(data.res2)
          vscode.commands.executeCommand('vscode.diff', res1, res2, 'New File (diff mode)', { viewColumn: 1, preserveFocus: true })
        }
      })
  }))

  context.subscriptions.push(registerCommand('CΩ.openDiff', function(resourceUri, cdir, cfile, title) {
    logger.log('COMMAND: openDiff request received')
  }))

  context.subscriptions.push(registerCommand('CΩ.refresh', function() {
    logger.log('COMMAND: refresh request received')
  }))

  context.subscriptions.push(registerCommand('CΩ.openFile', function({ resourceUri }, ...rest) {
    logger.log('COMMAND: openFile request received', resourceUri, rest)
    vscode.commands.executeCommand('vscode.open', resourceUri)
  }))

  context.subscriptions.push(registerCommand('CΩ.selectRange', function() {
    logger.log('COMMAND: selectRange request received')
  }))
}

export {
  setupCommands,
}
