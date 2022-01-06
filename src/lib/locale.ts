import { config as nlsConfig, MessageFormat as nlsMessageFormat } from 'vscode-nls'

function getLocale() {
  return JSON.parse(process.env.VSCODE_NLS_CONFIG as string).locale || 'en'
}

const localize = nlsConfig({ messageFormat: nlsMessageFormat.file })()

const AVAILABLE_LOCALES = ['en', 'ja'] // TODO: add more (server side translations)
const editorLocale = getLocale()

const locale = AVAILABLE_LOCALES.includes(editorLocale) ? editorLocale : 'en'

export {
  AVAILABLE_LOCALES,
  localize,
  locale,
}
