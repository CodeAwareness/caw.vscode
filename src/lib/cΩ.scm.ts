import { basename } from 'path'

import git from './git'
import { logger } from './logger'
import { pathJoin, existsSync, readdirSync } from './fs'
import { setupSCM } from '../vscode/vscode'

import { CΩRepository } from './peer8.repo'
import { CΩStore } from './peer8.store'
import { TDP } from './peer8.tdp'

/**
 * @param string origin (OR) - the URL for this repo (e.g. github.com/peer8/peer8.vscode.git)
 * @param string wsFolder (OR) - the local folder path for this repo
 */
function getProject({ origin, wsFolder }) {
  if (origin) {
    return CΩStore.projects.filter(m => m.origin === origin)[0]
  }
  if (wsFolder) {
    return CΩStore.projects.filter(m => m.root === wsFolder)[0]
  }
}

function addSubmodules(workspaceFolder) {
  // TODO: add submodules of submodules ? (recursive)
  const wsFolder = workspaceFolder.uri ? workspaceFolder.uri.path : workspaceFolder
  return git.gitCommand(wsFolder, 'git submodule status')
    .then(out => {
      if (!out) return
      const subs = []
      out.split('\n').map(line => {
        const res = / ([^\s]+) ([^\s]+) /.exec(line)
        if (res) subs.push(res[2])
      })
      logger.log('SCM git submodules: ', out, subs)
      subs.map(sub => addProject(pathJoin(wsFolder, sub)))
    })
    .catch(err => {
      logger.error('SCM git submodule error', err)
    })
}

function addProject(workspaceFolder) {
  logger.info('SCM addProject', workspaceFolder)
  const wsFolder = workspaceFolder.uri ? workspaceFolder.uri.path : workspaceFolder
  const hasGit = existsSync(pathJoin(wsFolder, '.git'))
  if (!hasGit) {
    logger.log('SCM Not a git folder', wsFolder)
    return Promise.resolve() // TODO: maybe allow other source control tools, besides git?
  }
  const { scm, scIndex } = setupSCM(wsFolder)
  const repo = CΩRepository.createFrom(wsFolder)
  const contributors = {}
  const changes = {}

  // TODO: pull changes to local workspace
  // Setup project origins
  return git.gitRemotes(wsFolder)
    .then(origin => {
      // TODO: Allow other versioning systems (gitlab, etc)
      // TODO: Check all remotes (check if ANY match)
      const root = wsFolder
      const name = basename(root)
      CΩStore.projects.push({ name, scm, scIndex, repo, origin, root, changes, contributors })
      TDP.addPeerWorkspace(workspaceFolder)
    })
    .catch(err => logger.error('SCM setupOrigin ERROR', err))
}

function removeSubmodules(workspaceFolder) {
  const wsFolder = workspaceFolder.uri ? workspaceFolder.uri.path : workspaceFolder
  return git.gitCommand(wsFolder, 'git submodule status')
    .then(out => {
      if (!out.trim()) return
      const subs = out.split('\n').map(line => / ([^\s]+) /.exec(line)[1])
      subs.map(sub => removeProject(pathJoin(wsFolder, sub)))
    })
}

function removeProject(wsFolder) {
  const project = CΩStore.projects.filter(m => m.name === wsFolder.name)[0]
  logger.info('SCM removeProject wsFolder', wsFolder, project)
  if (!project) return

  CΩStore.projects = Peer8Store.projects.filter(m => m.origin !== project.origin)
  project.scm.dispose()
  project.scIndex.dispose()

  TDP.removePeerWorkspace(wsFolder)
}

/**
 * CΩ SCM only has one resource group, which contains all changes.
 * There are no commits, as we always handle merging manually.
 */
function createProjects({ folders }) {
  if (!folders) return CΩStore.projects
  const promises = folders.map(addProject)
  promises.concat(folders.map(addSubmodules))
  return Promise.all(promises)
    .then(() => CΩStore.projects)
}

const getFiles = source =>
  readdirSync(source, { withFileTypes: true })
    .filter(dirent => !dirent.isDirectory())
    .map(dirent => dirent.name)

/*
const clearProject = project => {
  CΩStore.scFiles[project.origin] = []
}
*/

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
function addFile(wsFolder, fpath) {
  const parts = fpath.split('/').filter(a => a)
  let prevObj = CΩStore.peerFS[wsFolder]
  if (!prevObj) prevObj = {}
  CΩStore.peerFS[wsFolder] = prevObj
  let leaf
  for (const name of parts) {
    if (!prevObj[name]) prevObj[name] = {}
    leaf = { name, prevObj }
    prevObj = prevObj[name]
  }
  leaf.prevObj[leaf.name] = 1
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
