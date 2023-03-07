/**********************************
 * VSCode Source Control Management
 **********************************/
import * as vscode from 'vscode'
import { basename } from 'path'

import logger from './logger'

import CΩRepository from './cΩ.repo'
import CΩStore from './cΩ.store'

async function addProject(wsFolder: any) {
  logger.info('SCM addProject', wsFolder)
  const root = wsFolder.uri ? wsFolder.uri.path : wsFolder.toString()
  const name = basename(root)
  const scm = vscode.scm.createSourceControl('cΩ', 'CΩ: ' + name)
  const scIndex = scm.createResourceGroup('workingTree', 'Peer Changes')
  const repo = typeof wsFolder === 'object' ? CΩRepository.createFrom(wsFolder) : ''
  // TODO: add origin and enable SCM
  CΩStore.projects.push({ repo, scIndex, root })
}

function removeProject(wsFolder: any) {
  const folder: string = wsFolder.uri ? wsFolder.uri.path : wsFolder.toString()
  const project = CΩStore.projects.filter(m => m.root === folder)[0]
  logger.info('SCM removeProject wsFolder', folder, project)
  if (!project) return

  CΩStore.projects = CΩStore.projects.filter(m => m.origin !== project.origin)
  project.scm.dispose()
  project.scIndex.dispose()
}

export default {
  addProject,
  removeProject,
}
