import * as path from 'path'
import * as _ from 'lodash'
// import replaceStream from 'replacestream' // doesn't work (!)

import config from '@/config'
import logger from './logger'
import { CΩStore, TChanges } from './cΩ.store'

const isWindows = !!process.env.ProgramFiles

/************************************************************************************
 * Initialization
 *
 * At this time we're only setting up one thing: an empty file that we'll use to
 * create unified diffs against untracked git files.
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
