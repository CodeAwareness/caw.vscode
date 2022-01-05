import * as _ from 'lodash'

import { getActiveTextEditor, getEditorDocPath, setDecorations } from '../vscode/vscode'

import { logger } from './logger'
import { CΩStore } from './cΩ.store'

let lastUri
// TODO: make 2000 wait time into a configurable value
const insertAfterSomeTime = _.throttle(doInsert, 2000, { trailing: true })
const insertThenWaitSomeTime = _.throttle(doInsert, 2000, { leading: true })

function insertDecorations(leading) {
  const editor = getActiveTextEditor()
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

function doInsert(uri) {
  const project = CΩStore.activeProject
  const fpath = uri.substr(project.root.length + 1)
  const editor = getActiveTextEditor()
  logger.log('DECO: doInsert (project, uri, fpath)', project, uri, fpath)
  if (!project || !project.changes || !project.changes[fpath]) return setDecorations({ editor, ranges: [] })
  const alines = project.changes[fpath].alines
  logger.log('DECO: doInsert linesHash', alines)
  const linesHash = Object.keys(alines)
    .reduce((acc, sha) => {
      alines[sha].map(line => (acc[line] = 1))
      return acc
    }, {})
  const lines = Object.keys(linesHash)
  const ranges = lines.map(l => [[l, 0], [l, 256]])
  setDecorations({ editor, ranges })
}

function clear() {
  const editor = getActiveTextEditor()
  setDecorations({ editor, ranges: [] })
}

const CΩDeco = {
  clear,
  insertDecorations,
}

export { CΩDeco }
