/**************************
 * CodeAwareness code diffs
 **************************/
import * as vscode from 'vscode'
// import replaceStream from 'replacestream' // doesn't work (!)

import config from '@/config'

/* @ts-ignore */
const isWindows = !!vscode.process?.env.ProgramFiles

const pendingDiffs = {} as Record<string, any>

/************************************************************************************
 * Initialization
 ************************************************************************************/

function init() {
  console.log('isWindows?', isWindows)
}

function clear() {
  // TODO
}

/**
 * Shift the highlights based on the live edits you're making to the code (new / delete lines)
 * @param project object
 * @param fpath string
 * @returns void
 */
function shiftWithLiveEdits(project: any, fpath: string) {
  if (!project.changes || !project.changes[fpath]) return
  const shas = Object.keys(project.changes[fpath].alines).slice(0, config.MAX_NR_OF_SHA_TO_COMPARE)
  const { editorDiff } = project
  console.log('DIFFS: shiftWithLiveEdits editorDiffs', editorDiff)
  if (!editorDiff || !editorDiff[fpath]) return

  const liveLines = editorDiff[fpath]
  shas.map(sha => {
    const lines = project.changes[fpath].alines[sha] || []
    editorDiff[fpath] = []
    project.changes[fpath].alines[sha] = shiftLineMarkers(lines, liveLines)
    console.log('DIFFS: shiftWithLiveEdits (liveLines, alines)', liveLines, project.changes[fpath].alines)
  })
}

function shiftLineMarkers(lines: number[], ranges: any[]) {
  let shift = 0
  let pshift = 0
  let newLines: number[] = []
  console.log('shiftLineMarkers (lines, ranges)', lines, ranges)
  if (!ranges.length) return lines
  ranges.map(block => {
    shift = block.replaceLen - block.range.len
    const counted: boolean[] = []
    lines.map((line, i) => {
      if (line - pshift > block.range.line) lines[i] = Math.max(block.range.line, lines[i] + shift)
    })
    pshift = shift
    newLines = lines.filter(n => {
      if (!counted[n]) {
        counted[n] = true
        return true
      }
      return false
    })
  })

  return newLines
}

const CΩDiffs = {
  clear,
  init,
  pendingDiffs,
  shiftLineMarkers,
  shiftWithLiveEdits,
}

export default CΩDiffs
