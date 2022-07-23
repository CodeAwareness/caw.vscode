import * as vscode from 'vscode'
import { logger } from './logger'

import { CΩStore, TChanges } from './cΩ.store'
import { CΩWorkspace } from './cΩ.workspace'
import { CΩDeco } from './cΩ.deco'
import { CΩDiffs } from './cΩ.diffs'
import { CΩPanel } from './cΩ.panel'

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
function setActiveEditor(editor: TCΩEditor): Promise<void> {
  CΩStore.clear()
  CΩDiffs.clear()
  logger.log('EDITOR: setActiveEditor', editor)
  if (!editor) return Promise.reject()// TODO: figure out how to detect when first opening the panel (for some reason VSCode sends null as active text editor)
  CΩStore.activeTextEditor = editor
  const line = getSelectedLine(editor)
  const filePath = editor.document.fileName
  const uri = getEditorDocPath(editor)
  if (filePath.includes(CΩStore.tmpDir.name)) return Promise.reject() // Looking at a vscode.diff window
  if (CΩStore.activeContext.uri === uri) return Promise.reject() // already synced this
  // TODO: (maybe) should be able to get rid of activeContext and work only through CΩStore
  CΩStore.activeContext.uri = uri
  CΩStore.activeContext.dirty = true
  return CΩWorkspace.setupRepoFrom({ uri, line })
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
  if (!CΩStore.projects.length) return logger.info('EDITOR: No projects registered')
  if (!CΩStore.activeProject) return logger.info('EDITOR: No active project / no file selected')
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
  editors.map(editor => (editor._documentData._document.uri.path.includes(tmpDir.name) && closeEditor(editor)))
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
      if (fileName.toLowerCase().includes(tmpDir.name.toLowerCase())) closeActiveEditor()
    } catch {}

    return true
  }, 100)
}

/************************************************************************************
 * focusTextEditor
 *
 * When we open the CΩ panel, we need to re-focus on our editor (not stealing focus)
 ************************************************************************************/
function focusTextEditor(): Promise<void> {
  if (CΩStore.activeTextEditor) return Promise.resolve()
  const editors = vscode.window.visibleTextEditors as Array<TCΩEditor>
  return setActiveEditor(editors[0])
}

/************************************************************************************
 * getActiveContributors
 *
 * Retrieve all users who have touched the file since the common SHA.
 * The file in question is the activePath, showing in the focussed editor.
 ************************************************************************************/
function getActiveContributors(): Record<string, TChanges> {
  const ap = CΩStore.activeProject
  if (!ap) return {}

  const wsFolder = CΩStore.activeProject?.root
  const editor = CΩStore.activeTextEditor as TCΩEditor
  const uri = getEditorDocFileName(editor)
  // @ts-expect-error Issue with the trick i'm using
  const relativePath = uri.substr(wsFolder.length + !isWindows).replace(/\\/g, '/')

  if (!ap.changes) return {}
  logger.log('EDITOR: getActiveContributors (wsFolder, uri, relativePath, ap.changes, fileChanges, contributors)', wsFolder, uri, relativePath, ap.changes, ap.changes[relativePath], ap.contributors)
  return ap.changes[relativePath]
}

/************************************************************************************
 * syncWebview
 *
 * We sync the data in VSCode with the CodeAwareness webview,
 * in order to display the contributors for the activePath,
 * the local branche names, etc.
 ************************************************************************************/
function syncWebview() {
  if (!CΩPanel.hasPanel()) return false
  const editor = CΩStore.activeTextEditor
  const data = editor ? getSelections(editor) : {}
  setTimeout(() => { // because we don't get any close event from the webview, yeah, figures
    CΩPanel.postMessage(data)
  }, 10)
  const ap = CΩStore.activeProject
  if (!ap) return false

  return true
  // TODO
  /*
  git
    .gitBranches(CΩStore.activeProject.root)
    .then(({ branch, branches }) => {
      ap.branch = branch
      ap.branches = branches
      const activeProject = {
        activePath: ap.activePath,
        line: ap.line,
        name: ap.name,
        branch: ap.branch,
        branches: ap.branches,
        origin: ap.origin,
        root: ap.root,
      }
      const data = {
        user: CΩStore.user,
        tokens: CΩStore.tokens,
        contributors: getActiveContributors(),
        selectedContributor: CΩStore.selectedContributor,
        colorTheme: CΩStore.colorTheme,
        activeProject,
      }
      CΩPanel.postMessage({ command: 'initWithData', data })
    })
    */
}

export const CΩEditor = {
  closeDiffEditor,
  focusTextEditor,
  setActiveEditor,
  syncWebview,
  updateDecorations,
}
