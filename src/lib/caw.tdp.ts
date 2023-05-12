/***************************
 * VSCode Tree Data Provider
 ***************************/
import * as vscode from 'vscode'
import { EventEmitter, TreeItem, TreeItemCollapsibleState } from 'vscode'
import * as path from 'node:path'

import { CAWStore } from './caw.store'
import logger from './logger'

const dataChangeEvent = new EventEmitter()

let folders: Record<string, any> = {}

type WS_TREE_TYPE = {
  folder: string,
  tree: Record<string, any>,
  fpath: string,
}

export class TDItem extends TreeItem {
  folder: string
  fpath: string

  constructor(data: any) {
    const { label, folder, fpath, collapsibleState, command } = data
    super(label, collapsibleState)
    if (command) this.command = command
    this.folder = folder
    this.fpath = fpath
    this.tooltip = '' // TODO: maybe show a list of names of contributors for this item
    this.description = '' // TODO: maybe show the number of contributors changing this file / folder
  }
}

const toTDItem = ({ folder, tree, fpath }: WS_TREE_TYPE) => (key: string) => {
  const hasChildren = typeof tree[key] === 'object'
  const isFile = Object.keys(tree).length && !hasChildren
  const collapsibleState = isFile ? TreeItemCollapsibleState.None : TreeItemCollapsibleState.Expanded
  const itemPath = path.join(fpath, key)
  const uid = isFile && tree[key]
  const command = isFile ? { command: 'CAW.openPeerFile', arguments: [folder, itemPath, uid] } : null

  return new TDItem({
    label: key.split('/').pop(),
    folder,
    fpath: Object.keys(tree).length && itemPath || '',
    collapsibleState,
    command,
  })
}

/**
 * TreeDataProvider
 */
const TDP = {
  addProject: (project: any) => {
    vscode.workspace.workspaceFolders?.map(TDP.addPeerWorkspace)
    return project
  },

  addPeerWorkspace: (wsFolder: vscode.WorkspaceFolder) => {
    const fpath = wsFolder.uri?.path
    folders[fpath] = wsFolder.name
    CAWStore.peerFS[fpath] = {}
    return TDP
  },

  removePeerWorkspace: (wsFolder: vscode.WorkspaceFolder) => {
    const fPath = wsFolder.uri.path
    delete folders[fPath]
    delete CAWStore.peerFS[fPath]
    logger.log('TDP: removePeerWorkspace', fPath)
    TDP.refresh()
  },

  clearWorkspace: () => {
    folders = {}
  },

  provideTextDocumentContent: (/* uri: vscode.Uri, token: vscode.CancellationToken */): vscode.ProviderResult<string> => {
    // TODO: provide text document content; do we still need this?
    return 'TEST'
  },

  getTreeItem: (el: vscode.TreeItem): vscode.TreeItem => {
    return el
  },

  // theoretically we should only get files, not any empty folders, due to the way diffs are being managed (empty folders are ignored)
  getChildren: (el: TDItem): Thenable<TDItem[]> => {
    if (!folders) return Promise.resolve([])
    if (!el) return Promise.resolve(makeWSItems())
    const { peerFS } = CAWStore
    const { fpath, folder } = el
    // eslint-disable-next-line no-useless-escape
    const parts = fpath.split(/[\\\/]/).filter((a: string) => a)
    const tree = parts.reduce((acc: any, p: string) => acc[p], peerFS[folder])
    if (!tree) return Promise.resolve([])

    try {
      return Promise.resolve(Object.keys(tree).map(toTDItem({ folder, tree, fpath })))
    } catch (err) {
      console.log('TDP: err (fpath, folder, parts, tree)', err, fpath, folder, parts, tree)
    }

    return Promise.resolve([])

    function makeWSItems() {
      return Object.keys(folders).map(folder => toTDItem({ folder, tree: {}, fpath: '' })(folders[folder]))
    }
  },

  _onDidChangeTreeData: dataChangeEvent.event,
  onDidChangeTreeData: dataChangeEvent.event,

  refresh: (): any => {
    /* @ts-ignore */
    dataChangeEvent.fire(undefined)
  },

  /************************************************************************************
   * register file into the TDP
   *
   * DESIGN:
   * We're adding files to the CAW repository, but the user may have multiple repositories open, and we need to show diffs coresponding to multiple contributors.
   * Our CAW repository looks like this (where searchLib, microPost are just examples of repo names)

   * searchLib -> aliceId -> [ services/utils.js, main.js ]
   * searchLib -> bobId ->   [ services/logger.js, main.js ]
   * microPost -> bobId ->   [ settings/app.js, components/crispy.js ]

   * When we're adding files from downloaded diffs, we store them in this format, and we combine all the file paths into a list for VSCode Source Control Manager.
   ************************************************************************************/
  addFile: (folder: string) => (fpath: string) => {
    const parts = fpath.split('/').filter(a => a)
    let prevObj = CAWStore.peerFS[folder]
    if (!prevObj) prevObj = {}
    CAWStore.peerFS[folder] = prevObj
    let leaf
    for (const name of parts) {
      if (!prevObj[name]) prevObj[name] = {}
      leaf = { name, prevObj }
      prevObj = prevObj[name]
    }
    if (leaf) leaf.prevObj[leaf.name] = 1
  },
}

export default TDP
