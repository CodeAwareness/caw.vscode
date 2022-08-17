import * as vscode from 'vscode'
import { basename } from 'path'

import type { TProject } from './cΩ.store'
import { CΩStore } from './cΩ.store'

import logger from './logger'
import CΩRepository from './cΩ.repo'
import TDP from './cΩ.tdp'
import CΩWS from '@/lib/cΩ.ws'

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

function addSubmodules(wsFolder: vscode.WorkspaceFolder): Promise<TProject[]> {
  if (!CΩStore.ws?.rSocket) return Promise.resolve([])
  return CΩStore.ws.rSocket
    .transmit('repo:add-submodules', wsFolder)
}

function removeSubmodules(wsFolder: vscode.WorkspaceFolder) {
  // TODO
  return Promise.resolve()
}

function addProject(workspaceFolder: any): Promise<void | TProject> {
  logger.info('SCM: addProject workspaceFolder', workspaceFolder)
  const wsFolder = workspaceFolder.uri ? workspaceFolder.uri.path : workspaceFolder
  if (!CΩStore.ws?.rSocket) return Promise.resolve()
  return CΩStore.ws.rSocket
    .transmit('repo:add', wsFolder)
    .then((project: TProject) => {
      if (!project) {
        logger.log('SCM: Not a git folder', wsFolder)
        return // TODO: maybe allow other source control tools, besides git?
      }

      // TODO: pull changes to local workspace
      const { scm, scIndex } = setupSCM(wsFolder)
      project.repo = CΩRepository.createFrom(wsFolder)
      project.scm = scm
      project.scIndex = scIndex
      CΩStore.projects.push(project)
      TDP.addPeerWorkspace(workspaceFolder)
      logger.log('SCM: project', project)

      return project
    })
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
  const promises: Promise<any>[] = folders.map(addProject)
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

export default CΩSCM
