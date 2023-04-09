/**********************************
 * VSCode Source Control Management
 **********************************/
import * as vscode from 'vscode'
import { basename } from 'path'

import logger from './logger'

import CAWRepository from './caw.repo'
import CAWStore from './caw.store'

async function addProject(project: any) {
  logger.info('SCM addProject', project)
  const root = project.root
  const name = basename(root)
  const scm = vscode.scm.createSourceControl('caw', 'CAW: ' + name)
  const scIndex = scm.createResourceGroup('workingTree', 'Peer Changes')
  const repo = CAWRepository.createFrom(project)
  // TODO: add origin and enable SCM
  CAWStore.projects.push({ repo, scIndex, root })
}

function removeProject(wsFolder: any) {
  const folder: string = wsFolder.uri ? wsFolder.uri.path : wsFolder.toString()
  const project = CAWStore.projects.filter(m => m.root === folder)[0]
  logger.info('SCM removeProject wsFolder', folder, project)
  if (!project) return

  CAWStore.projects = CAWStore.projects.filter(m => m.origin !== project.origin)
  project.scm.dispose()
  project.scIndex.dispose()
}

export default {
  addProject,
  removeProject,
}
