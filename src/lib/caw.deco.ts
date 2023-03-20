/*********************
 * VSCode Decorations
 *********************/
import * as vscode from 'vscode'
import * as _ from 'lodash'

import { CAWStore } from './caw.store'
import logger from './logger'
import CAWPanel from './caw.panel'

let lastUri: string
// try to only insert decorations in the text editor at idle times; for now: at most once a second or so
// TODO: make 2000 wait time into a configurable value
const insertAfterSomeTime = _.throttle(doInsert, 1000, { trailing: true })
const insertThenWaitSomeTime = _.throttle(doInsert, 1000, { leading: true })
const getEditorDocPath = (editor: vscode.TextEditor) => editor?.document.uri.path

type TEditorRanges = {
  editor: vscode.TextEditor
  ranges: Array<any> // TODO
}

const rulerDecorationType = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  overviewRulerColor: 'red',
  overviewRulerLane: vscode.OverviewRulerLane.Right,
  light: {
    borderColor: 'darkred',
  },
  dark: {
    borderColor: 'lightred',
  },
})

const changeDecorationType = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  light: {
    backgroundColor: '#00b1a420',
  },
  dark: {
    backgroundColor: '#00b1a420',
  },
})

const peerDecorationType = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  light: {
    backgroundColor: '#ffdd34',
  },
  dark: {
    backgroundColor: '#1f1cc2',
  },
})

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

  // We don't insert line / range highlights when the panel is closed, to allow for more zen focus mode
  // TODO: make this configurable by the user
  const isPanelOpen = !!CAWPanel.hasPanel()
  // logger.info('setDecorations ranges', ranges, isPanelOpen)
  editor.setDecorations(changeDecorationType, isPanelOpen ? vsRanges : [])
  editor.setDecorations(rulerDecorationType, vsRanges)
  if (!isPanelOpen) editor.setDecorations(mergeDecorationType, [])
}

function insertDecorations(leading?: boolean) {
  const editor = CAWStore.activeTextEditor
  if (!editor) return
  const uri = getEditorDocPath(editor)
  logger.log('DECO: (leading, uri, lastUri)', leading, uri, lastUri)
  if (uri !== lastUri) {
    insertThenWaitSomeTime.cancel()
    insertAfterSomeTime.cancel()
  }
  if (leading) insertThenWaitSomeTime(uri)
  else insertAfterSomeTime(uri)
  lastUri = uri
}

function doInsert(uri: string) {
  const project = CAWStore.activeProject
  const editor = CAWStore.activeTextEditor
  if (!project || !editor) return
  const fpath = uri.substr(project.root.length + 1)
  logger.log('DECO: doInsert (project, uri, fpath)', project, uri, fpath)
  if (!project || !project.changes || !project.changes[fpath]) {
    return setDecorations({ editor, ranges: [] })
  }
  const alines: Record<string, any> = project.changes[fpath].alines
  if (!alines) return
  logger.log('DECO: doInsert linesHash', alines)
  const linesHash = Object.keys(alines)
    .reduce((acc: Record<string, number>, sha: string) => {
      alines[sha].map((line: number) => (acc[line] = 1))
      return acc
    }, {})
  const lines = Object.keys(linesHash)
  const ranges = lines.map(l => [[l, 0], [l, 256]])
  setDecorations({ editor, ranges })
}

function clear() {
  const editor = CAWStore.activeTextEditor
  if (!editor) return
  setDecorations({ editor, ranges: [] })
}

const CAWDeco = {
  clear,
  insertDecorations,
}

export default CAWDeco
