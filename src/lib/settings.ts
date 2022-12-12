import * as vscode from 'vscode'
/*
 * VSCode specific settings
 * TODO: separate these from the general settings, which may be applicable to Atom
 */

import logger from './logger'
import { CΩStore } from './cΩ.store'

/**
 * Projects may contain a .cΩ file, in which the user can store their own personalised settings.
 * These .cΩ files function in a similar way to .eslintrc and .editorconfig files
 */
function checkConfiguration(/* context */) {
  const vscodeConfig = vscode.workspace.getConfiguration('codeAwareness')
  logger.info('SETTINGS configuration', vscodeConfig) // TODO: add settings

  if (!vscode.workspace.workspaceFolders) return Promise.resolve()

  // TODO: configure ... all things
  return Promise.resolve()
}

function initConfig() {
  return checkConfiguration()
    .then(() => {
      logger.info('CONFIGURATION READY')
      CΩStore.colorTheme = vscode.window.activeColorTheme.kind
    })
}

export {
  initConfig,
  checkConfiguration,
}
