/**********************************************************
 * VSCode Decorations
 *
 * Defines and handles the gutter decorations,
 * as well as the line highlights inside the text editor.
 **********************************************************/
import * as vscode from 'vscode'
import * as _ from 'lodash'

import { CAWStore } from './caw.store'
import config from '@/config'
import logger from './logger'
import CAWPanel from './caw.panel'

let lastPath: string
// TODO: make 2000 wait time into a configurable value
const insertAfterSomeTime = _.throttle(doInsert, 500, { trailing: true })
const insertThenWaitSomeTime = _.throttle(doInsert, 500, { leading: true })

type TEditorRanges = {
  editor: vscode.TextEditor
  ranges: Array<any> // TODO
}

const rulerDecorationType = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  // TODO: add a user setting to allow marking line changes with gutter icons instead of overviewRulerLane
  overviewRulerColor: 'blue',
  overviewRulerLane: vscode.OverviewRulerLane.Left,
  light: {
    borderColor: 'darkred',
  },
  dark: {
    borderColor: 'lightred',
  },
})

/* Decoration indicating a change by others */
const changeDecorationType = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  light: {
    backgroundColor: '#00b1a420',
  },
  dark: {
    backgroundColor: '#03445f',
  },
})

/* Decoration indicating the code shown is peer's code, not local */
const peerDecorationType = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  light: {
    backgroundColor: '#ffdd34',
  },
  dark: {
    backgroundColor: '#1f1cc2',
  },
})

/* Decoration indicating the code shown is merged code. This indicates accepted line from peer code. */
const mergeDecorationType = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  light: {
    backgroundColor: '#ffc000',
  },
  dark: {
    backgroundColor: '#141299',
  },
})

function setDecorations(options: TEditorRanges) {
  const { editor, ranges } = options
  if (!ranges || !editor) return
  const vsRanges = ranges.map(range => {
    return new vscode.Range(
      new vscode.Position(Math.max(0, range[0][0] - 1), 0),
      new vscode.Position(Math.max(0, range[1][0] - 1), 180),
    )
  })

  // If not explicitly configured by the user, we don't insert line / range highlights when the panel is closed, to allow for more zen focus mode
  // TODO: make this configurable by the user
  const isPanelOpen = !!CAWPanel.hasPanel()
  // logger.info('setDecorations ranges', ranges, isPanelOpen)
  editor.setDecorations(changeDecorationType, isPanelOpen || config.HIGHLIGHT_WHILE_CLOSED ? vsRanges : [])
  editor.setDecorations(rulerDecorationType, vsRanges)
  if (!isPanelOpen && ! config.HIGHLIGHT_WHILE_CLOSED) editor.setDecorations(mergeDecorationType, [])
}

function insertDecorations(leading?: boolean) {
  const editor = CAWStore.activeTextEditor
  if (!editor || !CAWStore.activeProject?.activePath) return
  const activePath = CAWStore.activeProject?.activePath
  logger.log('DECO: (leading, activePath, lastPath)', leading, activePath, lastPath)
  if (activePath !== lastPath) {
    insertThenWaitSomeTime.cancel()
    insertAfterSomeTime.cancel()
  }
  if (leading) insertThenWaitSomeTime(activePath)
  else insertAfterSomeTime(activePath)
  lastPath = activePath
}

function doInsert(fpath: string) {
  const project = CAWStore.activeProject
  const editor = CAWStore.activeTextEditor
  if (!project || !editor || project.activePath !== fpath) return // Note: if the user switches to a different file quickly, we don't want to insert the wrong decorations from previously opened file
  logger.log('DECO: doInsert (fpath, highlights)', fpath, project.hl)

  if (!project?.hl) {
    return setDecorations({ editor, ranges: [] })
  }
  const ranges = project.hl.map((l: number) => [[l, 0], [l, 255]])
  setDecorations({ editor, ranges })
}

function clear() {
  const editor = CAWStore.activeTextEditor
  if (!editor) return
  setDecorations({ editor, ranges: [] })
}

function flashLines(editor: vscode.TextEditor, line: number, len: number, replaceLen: number) {
  return new Promise(resolve => {
    const rangeBefore = new vscode.Range(
      new vscode.Position(line, 0),
      new vscode.Position(line + len, 180),
    )
    const rangeAfter = new vscode.Range(
      new vscode.Position(line, 0),
      new vscode.Position(line + replaceLen, 180),
    )
    editor.setDecorations(peerDecorationType, [rangeBefore])
    setTimeout(() => {
      editor.setDecorations(peerDecorationType, [])
      editor.setDecorations(changeDecorationType, [rangeAfter])
      resolve(null)
    }, 1000)
  })
}

const CAWDeco = {
  clear,
  flashLines,
  insertDecorations,
}

export default CAWDeco
