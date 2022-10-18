import * as vscode from 'vscode'
import * as _ from 'lodash'
// import replaceStream from 'replacestream' // doesn't work (!)

/* @ts-ignore */
const isWindows = !!vscode.process?.env.ProgramFiles

/************************************************************************************
 * Initialization
 ************************************************************************************/

function init() {
}

function clear() {
  // TODO
}

const CΩDiffs = {
  clear,
  init,
}

export default CΩDiffs
