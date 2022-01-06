import * as path from 'path'
import * as _ from 'lodash'
// import replaceStream from 'replacestream' // doesn't work (!)

import {  MAX_NR_OF_SHA_TO_COMPARE, SYNC_THRESHOLD } from '@/config'
import { logger } from './logger'
import { CΩStore, TChanges, TProject, TTmpDir } from './cΩ.store'

const PENDING_DIFFS: Record<string, boolean> = {}
const isWindows = !!process.env.ProgramFiles

/************************************************************************************
 * Initialization
 *
 * At this time we're only setting up one thing: an empty file that we'll use to
 * create unified diffs against untracked git files.
 ************************************************************************************/
let tmpDir: TTmpDir

function init() {
  tmpDir = CΩStore.tmpDir
}

/************************************************************************************
 * Diffs active file with the same file in a local branch
 *
 * Open the VSCode standard diff window.
 ************************************************************************************/
function diffWithBranch(branch: string) {
  // TODO
  return Promise.resolve()
}

/************************************************************************************
 * Diffs active file with the same file at a peer.
 *
 * Open the VSCode standard diff window.
 * We're processing the unified diffs from the peer,
 * and recreate their file in a temporary folder,
 * after which we can open a standard diff VSCode window.
 *
 * TODO: maybe (!) for small teams, download all diffs at once,
 * rather than one request for each contributor;
 *
 * As a guideline, CodeAwareness should focus on small teams.
 * Perhaps this can change in the future.
 ************************************************************************************/
function diffWithContributor() {
  // TODO
  return Promise.resolve()
}

/************************************************************************************
 * Send Commmit Log to the server
 *
 * We're sending a number of commit SHA values (e.g. latest 100) to the server,
 * in order to compute the common ancestor SHA for everyone in a team.
 ************************************************************************************/
function sendCommitLog(project: TProject) {
  // TODO
  return Promise.resolve()
}

/************************************************************************************
 * sendDiffs
 *
 * @param Object - CΩStore project
 *
 * We're running a git diff against the common SHA, archive this with gzip
 * and send it to the server.
 * TODO: OPTIMIZATION: send only the file that was just saved (if file save event)
 * or the files modified (if file system event)
 ************************************************************************************/
const lastSendDiff = []
function sendDiffs(project: TProject) {
  // TODO
  return Promise.resolve()
}

function uploadDiffs(options: any) {
  // TODO
  return Promise.resolve()
}

/************************************************************************************
 * refreshChanges
 *
 * @param object - CΩStore project
 * @param string - the file path of the active document
 *
 * Refresh the peer changes for the active file.
 * 1. Download the changes (line numbers only) from the server
 * 2. Diff against the common SHA
 * 3. Shift the line markers received from the server, to account for local changes.
 *
 * TODO: cleanup older changes; the user closes tabs (maybe) but we're still keeping
 * the changes in CΩStore (project.changes)
 ************************************************************************************/
const lastDownloadDiff: Record<string, number> = {}
function refreshChanges(project: TProject, fpath: string) {
  /* TODO: add caching (so we don't keep on asking for the same file when the user mad-clicks the same contributor) */
  const wsPath = project.root

  logger.log('DIFFS: downloadDiffs (origin, fpath, user)', project.origin, fpath, CΩStore.user)
  PENDING_DIFFS[fpath] = true // this operation can take a while, so we don't want to start it several times per second
  if (lastDownloadDiff[wsPath] && new Date().valueOf() - lastDownloadDiff[wsPath] < SYNC_THRESHOLD) {
    return Promise.resolve()
  }

  lastDownloadDiff[wsPath] = new Date().valueOf()

  return downloadLinesChanged(project, fpath)
    .then(() => {
      return getLinesChangedLocaly(project, fpath)
    })
    .then(() => {
      logger.log('DIFFS: will shift markers (changes)', project.changes && project.changes[fpath])
      shiftWithGitDiff(project, fpath)
      shiftWithLiveEdits(project, fpath) // include editing operations since the git diff was initiated
      delete PENDING_DIFFS[fpath] // pending diffs complete
    })
    .catch(console.error)
}

/************************************************************************************
 * downloadLinesChanged
 *
 * @param object - CΩStore project
 * @param string - the file path of the active document
 *
 * We download the list of contributors for the active file,
 * and aggregate their changes to display the change markers
 ************************************************************************************/
function downloadLinesChanged(project: TProject, fpath: string) {
  // TODO
  return Promise.resolve()
}

/************************************************************************************
 * getLinesChangedLocaly
 *
 * @param object - CΩStore project
 * @param string - the file path of the active document
 *
 * Getting the changes from the active document (not yet written to disk).
 ************************************************************************************/
function getLinesChangedLocaly(project: TProject, fpath: string) {
  // TODO
  return Promise.resolve()
}

/*
 * shiftWithGitDiff
 *
 * @param object - project
 * @param string - the file path for which we extracted the diffs
 *
 * Update (shift) the line markers to account for the local edits and git diffs since the cSHA
 * Operation order:
 * - gitDiff
 * - local edits after the git diff was initiated (if the user is quick on keyboard)
 * - aggregate lines
 */
function shiftWithGitDiff(project: TProject, fpath: string) {
  // logger.log('DIFFS: shiftWithGitDiff (project.gitDiff, fpath, project.changes)', project.gitDiff, fpath, project.changes[fpath])
  if (
    !project.gitDiff || !Object.keys(project.gitDiff[fpath]).length
    || !project.changes || !Object.keys(project.changes[fpath]).length
  ) return

  const shas = Object.keys(project.changes[fpath].l).slice(0, MAX_NR_OF_SHA_TO_COMPARE)
  shas.map((sha: string) => {
    const changes: Record<string, any> = project.changes && project.changes[fpath] || {}
    const gitDiff: Record<string, any> = project.gitDiff && project.gitDiff[fpath] || {}
    const lines = changes.filter((change: TChanges) => change.s === sha)[0]?.l || []
    const localLines = gitDiff[sha] || []
    if (!project.changes![fpath][sha]) project.changes![fpath][sha] = {}
    project.changes![fpath][sha].l = shiftLineMarkers(lines, localLines)
    // logger.log('DIFFS: shiftWithGitDiff (localLines, alines, fpath)', localLines, project.changes[fpath].alines, fpath)
  })
}

function shiftWithLiveEdits(project: TProject, fpath: string) {
  if (!project.changes || !Object.keys(project.changes[fpath]).length) return
  const shas = Object.keys(project.changes[fpath].alines).slice(0, MAX_NR_OF_SHA_TO_COMPARE)
  const { editorDiff } = project
  if (!editorDiff || !editorDiff[fpath]) return

  const liveLines = editorDiff[fpath]
  shas.map(sha => {
    if (!project.changes![fpath][sha]) project.changes![fpath][sha] = {}
    const lines = project.changes![fpath][sha]?.l || []
    editorDiff[fpath] = []
    project.changes![fpath][sha].l = shiftLineMarkers(lines, liveLines)
    // logger.log('DIFFS: shiftWithLiveEdits (liveLines, alines)', liveLines, project.changes![fpath])
  })
}

function shiftLineMarkers(lines: Array<number>, ranges: Array<any>) {
  let shift = 0
  let pshift = 0
  let newLines: Array<number> = []
  // logger.log('shiftLineMarkers (lines, ranges)', lines, ranges)
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

function clearLocalDiffs(project: TProject) {
  project.gitDiff = {}
}

function parseDiffFile(diffs: string) {
  const lines = diffs.split('\n')
  const changes = []
  let sLine = 0
  let delLines = 0
  let insLines = 0
  for (const line of lines) {
    const start = line.substr(0, 3)
    if (['---', '+++', 'ind'].includes(start)) continue
    if (line[0] === '-') {
      delLines++
    } else if (line[0] === '+') {
      insLines++
    } else if (start === '@@ ') {
      /* eslint-disable-next-line security/detect-unsafe-regex */
      const matches = /@@ -([0-9]+)(,[0-9]+)? \+([0-9]+)(,[0-9]+)? @@/.exec(line)
      if (delLines || insLines) {
        changes.push({
          range: { line: sLine, len: delLines },
          replaceLen: insLines,
        })
      }
      if (matches) {
        sLine = parseInt(matches[1], 10)
        delLines = 0
        insLines = 0
      }
    }
  }

  // last bit
  changes.push({
    range: { line: sLine, len: delLines },
    replaceLen: insLines,
  })

  return changes
}

function clear() {
  // TODO
}

const CΩDiffs = {
  clear,
  diffWithContributor,
  diffWithBranch,
  init,
  refreshChanges,
  sendCommitLog,
  sendDiffs,
  shiftWithLiveEdits,
  uploadDiffs, // IMPORTANT: used for mocking purposes in integration tests; use sendDiffs instead
  PENDING_DIFFS,
}

export { CΩDiffs }
