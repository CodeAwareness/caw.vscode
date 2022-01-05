import * as vscode from 'vscode'
/*
 * VSCode specific settings
 * TODO: separate these from the general settings, which may be applicable to Atom
 */

import { logger } from './logger'
import { CΩStore } from './cΩ.store'

/**
 * Projects may contain a .peer8 file, in which the user can store their own personalised settings.
 * These .peer8 files function in a similar way to .eslintrc and .editorconfig files
 *
 * TODO: securely store API keys for persistent login
 */
function checkConfigurationFile(/* context */) {
  const vscodeConfig = vscode.workspace.getConfiguration('codeAwareness')
  logger.info('SETTINGS configuration', vscodeConfig) // TODO: add settings

  if (!vscode.workspace.workspaceFolders) return Promise.resolve()
  const configPromises = vscode.workspace.workspaceFolders.map(folder => initializeFolderFromConfigurationFile(folder))

  return Promise.all(configPromises)
}

function initializeFolderFromConfigurationFile(folder: vscode.WorkspaceFolder) {
  return Promise.resolve()
  // TODO
  /*
  const configurationPath = pathJoin(folder.uri.path, CONFIGURATION_FILE)

  return exists(configurationPath)
    .then(configFileExists => {
      if (!configFileExists) return logger.info('SETTINGS project without peer8 configuration file')
      return readFile(configurationPath)
    })
    .then(data => {
      if (!data) return
      const configuration = JSON.parse(data.toString('UTF8'))
      logger.info('SETTINGS project contains peer8 configuration file', configuration)
      return configuration
    })
  */
}

function initConfig() {
  checkConfigurationFile()
    .then(() => {
      CΩStore.colorTheme = vscode.window.activeColorTheme.kind
    })
}

export {
  initConfig,
  checkConfigurationFile,
  initializeFolderFromConfigurationFile,
}
