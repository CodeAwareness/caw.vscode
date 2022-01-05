import { logger } from './logger'
import { closeActiveEditor, commands, getActiveTextEditor, getEditorDocPath, getSelections, getSelectedLine, setActiveTextEditor, setDirty, window, getEditorDocFileName } from '../vscode/vscode'

import { CΩStore } from './peer8.store'
import { CΩWorkspace } from './peer8.workspace'
import { CΩDeco } from './peer8.deco'
import { CΩDiffs } from './peer8.diffs'
import { CΩPanel } from './peer8.panel'

import git from './git'

const activeContext = {}
const isWindows = !!process.env.ProgramFiles

/************************************************************************************
 * setActiveEditor
 *
 * @param Object - editor object from VSCode
 *
 * We're setting up the workspace everytime a new editor is activated,
 * because the user may have several repositories open, or a file outside any repo.
 ************************************************************************************/
function setActiveEditor(editor) {
  CΩStore.clear()
  CΩDiffs.clear()
  logger.log('EDITOR: setActiveEditor', editor)
  if (!editor) return // TODO: figure out how to detect when first opening the panel (for some reason VSCode sends null as active text editor)
  setActiveTextEditor(editor)
  const line = getSelectedLine(editor)
  const filePath = editor.document.fileName
  const uri = getEditorDocPath(editor)
  if (filePath.includes(CΩStore.tmpDir.name)) return // Looking at a vscode.diff window
  if (activeContext.url === uri) return // already synced this
  // TODO: (maybe) should be able to get rid of activeContext and work only through CΩStore
  activeContext.uri = uri
  setDirty(true)
  return CΩWorkspace.setupRepoFrom({ uri, line })
}

/************************************************************************************
 * updateDecorations
 *
 * CΩWorkspace calls this function when we have a change or a new file open.
 ************************************************************************************/
function updateDecorations() {
  logger.log('EDITOR: syncing webview')
  const editor = getActiveTextEditor()
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
let tryingToClose // Yeah, I don't know how to do this, VSCode seems to be stripped of fundamental window concepts
function closeDiffEditor() {
  const { tmpDir } = CΩStore
  /*
  const editors = window.visibleTextEditors
  editors.map(editor => (editor._documentData._document.uri.path.includes(tmpDir.name) && closeEditor(editor)))
  */
  setTimeout(() => {
    const editor = window.activeTextEditor
    if (!editor) {
      commands.executeCommand('workbench.action.focusNextGroup')
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
  }, 100)
}

/************************************************************************************
 * focusTextEditor
 *
 * When we open the CΩ panel, we need to re-focus on our editor (not stealing focus)
 ************************************************************************************/
function focusTextEditor() {
  if (getActiveTextEditor()) return
  const editors = window.visibleTextEditors
  return setActiveEditor(editors[0])
}

/************************************************************************************
 * getActiveContributors
 *
 * Retrieve all users who have touched the file since the common SHA.
 * The file in question is the activePath, showing in the focussed editor.
 ************************************************************************************/
function getActiveContributors() {
  const ap = CΩStore.activeProject

  const wsFolder = CΩStore.activeProject.root
  const editor = getActiveTextEditor()
  const uri = getEditorDocFileName(editor)
  const relativePath = uri.substr(wsFolder.length + !isWindows).replace(/\\/g, '/')

  logger.log('EDITOR: getActiveContributors (wsFolder, uri, relativePath, ap.changes, fileChanges, contributors)', wsFolder, uri, relativePath, ap.changes, ap.changes[relativePath], ap.contributors[relativePath])
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
  if (!CΩPanel.hasPanel()) return
  const editor = getActiveTextEditor()
  const data = editor ? getSelections(editor) : {}
  setTimeout(() => { // because we don't get any close event from the webview, yeah, figures
    CΩPanel.postMessage(data)
  }, 10)
  const ap = CΩStore.activeProject
  if (!ap) return
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
        colorTheme: CΩStore.vsCodeColorTheme,
        activeProject,
      }
      CΩPanel.postMessage({ command: 'initWithData', data })
    })
}

export const CΩEditor = {
  closeDiffEditor,
  focusTextEditor,
  setActiveEditor,
  syncWebview,
  updateDecorations,
}
