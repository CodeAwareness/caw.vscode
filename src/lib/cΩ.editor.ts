import * as vscode from 'vscode'
import logger from './logger'

import type { TChanges } from './cΩ.store'
import { CΩStore } from './cΩ.store'
import CΩWorkspace from './cΩ.workspace'
import CΩDeco from './cΩ.deco'
import CΩDiffs from './cΩ.diffs'
import CΩPanel from './cΩ.panel'

const isWindows = !!process.env.ProgramFiles

export type TCΩEditor = vscode.TextEditor & {
  _documentData: any
  _selections: Array<any>
  _visibleRanges: Array<any>
}

const getSelectedLine = (editor: TCΩEditor) => editor._selections && editor._selections[0].active.line
const getEditorDocPath = (editor: TCΩEditor) => editor.document.uri.path
const getEditorDocFileName = (editor: TCΩEditor) => editor.document.fileName

const closeActiveEditor = () => {
  return vscode.commands.executeCommand('workbench.action.closeActiveEditor')
}

// TODO: why TCΩEditor doesn't work here as a type (what's length and ev[0]?)
const getSelections = (ev: any) => {
  if (!ev || !ev.length || !ev[0]) return { selections: [], visibleRanges: [], uri: '' }
  const uri = ev._documentData._uri
  const selections = ev._selections
  const visibleRanges = ev._visibleRanges
  return { selections, visibleRanges, uri }
}

/************************************************************************************
 * setActiveEditor
 *
 * @param Object - editor object from VSCode
 *
 * We're setting up the workspace everytime a new editor is activated,
 * because the user may have several repositories open, or a file outside any repo.
 ************************************************************************************/
function setActiveEditor(editor: TCΩEditor) {
  CΩStore.clear()
  CΩDiffs.clear()
  CΩStore.activeTextEditor = editor
  logger.info('EDITOR: set active editor', editor)
}

/************************************************************************************
 * updateDecorations
 *
 * CΩWorkspace calls this function when we have a change or a new file open.
 ************************************************************************************/
function updateDecorations() {
  logger.log('EDITOR: syncing webview')
  const editor = CΩStore.activeTextEditor
  if (!editor) return logger.error('EDITOR trying to setup editor failed; no active text editor.')
  CΩDeco.insertDecorations()
}

/************************************************************************************
 * closeDiffEditor
 *
 * A workaround attempt, trying to close the diff window when the user clicks the
 * same selected contributor in CodeAwareness WebView
 ************************************************************************************/
let tryingToClose: boolean // Yeah, I don't know how to do this, VSCode seems to be stripped of fundamental window concepts, or maybe it's an Electron issue
function closeDiffEditor() {
  const { tmpDir } = CΩStore
  /*
  const editors = window.visibleTextEditors
  editors.map(editor => (editor._documentData._document.uri.path.includes(tmpDir) && closeEditor(editor)))
  */
  setTimeout(() => {
    const editor = vscode.window.activeTextEditor as TCΩEditor
    if (!editor) {
      vscode.commands.executeCommand('workbench.action.focusNextGroup')
      if (tryingToClose) {
        tryingToClose = false
        return
      }
      tryingToClose = true
      return setTimeout(closeDiffEditor, 100)
    } else {
      /*
      commands.executeCommand( 'workbench.action.focusNextGroup')
      commands.executeCommand( 'workbench.action.focusPreviousGroup')
      */
    }
    tryingToClose = false
    const fileName = getEditorDocFileName(editor)
    try {
      if (fileName.toLowerCase().includes(tmpDir.toLowerCase())) closeActiveEditor()
    } catch {}

    return true
  }, 100)
}

/************************************************************************************
 * focusTextEditor
 *
 * When we open the CΩ panel, we need to re-focus on our editor (not stealing focus)
 ************************************************************************************/
function focusTextEditor() {
  if (CΩStore.activeTextEditor) return
  const editors = vscode.window.visibleTextEditors as Array<TCΩEditor>
  setActiveEditor(editors[0])
}

/************************************************************************************
 * getActiveContributors
 *
 * Retrieve all users who have touched the file since the common SHA.
 * The file in question is the activeFile, showing in the focussed editor.
 ************************************************************************************/
function getActiveContributors(): Record<string, TChanges> {
  // TODO
  return {}
}

const CΩEditor = {
  closeDiffEditor,
  focusTextEditor,
  setActiveEditor,
  updateDecorations,
}

export default CΩEditor
