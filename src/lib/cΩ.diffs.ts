import * as vscode from 'vscode'
// import replaceStream from 'replacestream' // doesn't work (!)

/* @ts-ignore */
const isWindows = !!vscode.process?.env.ProgramFiles

/************************************************************************************
 * Initialization
 ************************************************************************************/

function init() {
  console.log('isWindows?', isWindows)
}

function clear() {
  // TODO
}

const CΩDiffs = {
  clear,
  init,
}

export default CΩDiffs
