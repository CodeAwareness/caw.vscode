/***************
 * VSCode Locale
 ***************/
import * as vscode from 'vscode'
import { config as nlsConfig, MessageFormat as nlsMessageFormat } from 'vscode-nls'

import logger from './logger'

function getLocale() {
  logger.log('vscode locale', vscode.env?.language)
  /* @ts-ignore */
  return vscode.env.language || 'en'
}

const localize = nlsConfig({ messageFormat: nlsMessageFormat.file, locale: getLocale() })()

const AVAILABLE_LOCALES = ['en', 'ja'] // TODO: add more (server side translations)
const editorLocale = getLocale()

const locale = AVAILABLE_LOCALES.includes(editorLocale) ? editorLocale : 'en'

export {
  AVAILABLE_LOCALES,
  localize,
  locale,
}
