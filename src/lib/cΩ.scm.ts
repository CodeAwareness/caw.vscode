import * as vscode from 'vscode'
import { basename } from 'path'

import { logger } from './logger'

import { CΩStore, TProject } from './cΩ.store'
import { TDP } from './cΩ.tdp'

function setupSCM(wsFolder: vscode.WorkspaceFolder) {
  const name = basename(wsFolder.uri.path)
  const scm = vscode.scm.createSourceControl('cΩ', 'CΩ: ' + name)
  const scIndex = scm.createResourceGroup('workingTree', 'Peer Changes')
  return { scm, scIndex }
}

type TOriginFolder = {
  origin: string
  wsFolder: string
}

/**
 * @param string origin (OR) - the URL for this repo (e.g. github.com/peer8/peer8.vscode.git)
 * @param string wsFolder (OR) - the local folder path for this repo
 */
function getProject(options: TOriginFolder): TProject | null {
  const { origin, wsFolder } = options
  if (origin) {
    return CΩStore.projects.filter(m => m.origin === origin)[0]
  }
  if (wsFolder) {
    return CΩStore.projects.filter(m => m.root === wsFolder)[0]
  }

  return null
}

function addSubmodules(wsFolder: vscode.WorkspaceFolder) {
  // TODO
  return Promise.resolve()
}

function removeSubmodules(wsFolder: vscode.WorkspaceFolder) {
  // TODO
  return Promise.resolve()
}

function addProject(wsFolder: vscode.WorkspaceFolder) {
  // TODO
  return Promise.resolve()
}

function removeProject(wsFolder: vscode.WorkspaceFolder) {
  const project = CΩStore.projects.filter(m => m.name === wsFolder.name)[0]
  logger.info('SCM removeProject wsFolder', wsFolder, project)
  if (!project) return

  CΩStore.projects = CΩStore.projects.filter(m => m.origin !== project.origin)
  project.scm?.dispose()
  project.scIndex.dispose()

  TDP.removePeerWorkspace(wsFolder)
}

function clearProject(project: TProject) {
  // TODO
  return Promise.resolve()
}

/**
 * CΩ SCM only has one resource group, which contains all changes.
 * There are no commits, as we always handle merging manually.
 */
function createProjects(folders: Array<vscode.WorkspaceFolder>): Promise<TProject[]> {
  if (!folders) return Promise.resolve(CΩStore.projects)
  const promises = folders.map(addProject)
  promises.concat(folders.map(addSubmodules))
  return Promise.all(promises)
    .then(() => CΩStore.projects)
}

function getFiles(source: string) {
  // TODO
  return Promise.resolve()
}

/************************************************************************************
 * addFile = registerWithTDP
 *
 * DESIGN:
 * We're adding files to the CΩ repository, but the user may have multiple repositories open, and we need to show diffs coresponding to multiple contributors.
 * Our CΩ repository looks like this (where searchLib, microPost are just examples of repo names)

 * searchLib -> aliceId -> [ services/utils.js, main.js ]
 * searchLib -> bobId ->   [ services/logger.js, main.js ]
 * microPost -> bobId ->   [ settings/app.js, components/crispy.js ]

 * When we're adding files from downloadDiff, we store them in this format, and we combine all the file paths into a list for VSCode Source Control Manager.
 ************************************************************************************/
function addFile(wsFolder: vscode.WorkspaceFolder, fpath: string) {
  const wsPath = wsFolder.uri.path
  const parts = fpath.split('/').filter(a => a)
  let prevObj = CΩStore.peerFS[wsPath]
  if (!prevObj) prevObj = {}
  CΩStore.peerFS[wsPath] = prevObj
  let leaf
  for (const name of parts) {
    if (!prevObj[name]) prevObj[name] = {}
    leaf = { name, prevObj }
    prevObj = prevObj[name]
  }
  if (leaf) leaf.prevObj[leaf.name] = 1
  TDP.refresh()
}

const CΩSCM = {
  addProject,
  addSubmodules,
  getProject,
  createProjects,
  removeProject,
  removeSubmodules,
  addFile,
  getFiles,
}

export { CΩSCM }
