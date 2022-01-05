import { localize, getLocale } from '../vscode/vscode'

const AVAILABLE_LOCALES = ['en', 'ja'] // TODO: add more (server side translations)
const editorLocale = getLocale()

const locale = AVAILABLE_LOCALES.includes(editorLocale) ? editorLocale : 'en'

export {
  AVAILABLE_LOCALES,
  localize,
  locale,
}
