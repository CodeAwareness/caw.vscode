import * as vscode from 'vscode'
import * as path from 'path'
import * as _ from 'lodash'
// import replaceStream from 'replacestream' // doesn't work (!)

import config from '@/config'
import logger from './logger'
import { CΩStore, TChanges } from './cΩ.store'

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
