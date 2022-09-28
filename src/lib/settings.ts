import * as vscode from 'vscode'
/*
 * VSCode specific settings
 * TODO: separate these from the general settings, which may be applicable to Atom
 */

import logger from './logger'
import { CΩStore } from './cΩ.store'

/**
 * Projects may contain a .peer8 file, in which the user can store their own personalised settings.
 * These .peer8 files function in a similar way to .eslintrc and .editorconfig files
 *
 * TODO: securely store API keys for persistent login
 */
function checkConfiguration(/* context */) {
  const vscodeConfig = vscode.workspace.getConfiguration('codeAwareness')
  logger.info('SETTINGS configuration', vscodeConfig) // TODO: add settings

  if (!vscode.workspace.workspaceFolders) return Promise.resolve()

  // TODO: configure ... all things
  return Promise.resolve()
}

function initConfig() {
  checkConfiguration()
    .then(() => {
      CΩStore.colorTheme = vscode.window.activeColorTheme.kind
    })
}

export {
  initConfig,
  checkConfiguration,
}
