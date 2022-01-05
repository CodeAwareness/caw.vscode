import * as vscode from 'vscode'
import { EventEmitter, TreeItem, TreeItemCollapsibleState } from 'vscode'
import * as path from 'path'

import { CΩStore } from './cΩ.store'
import { logger } from './logger'

const dataChangeEvent = new EventEmitter()
let folders: Record<string, any> = {}

type WS_TREE_TYPE = {
  wsFolder: string,
  tree: Record<string, any>,
  fpath: string,
}

const toTDItem = ({ wsFolder, tree, fpath }: WS_TREE_TYPE) => (key: string) => {
  const hasChildren = typeof tree[key] === 'object'
  const isFile = tree && !hasChildren
  const collapsibleState = isFile ? TreeItemCollapsibleState.None : TreeItemCollapsibleState.Expanded
  const itemPath = path.join(fpath, key)
  const uid = isFile && tree[key]
  const command = isFile ? { command: 'cA.openPeerFile', arguments: [wsFolder, itemPath, uid] } : null

  return new TDItem({
    label: key.split('/').pop(),
    wsFolder,
    fpath: tree && itemPath,
    collapsibleState,
    command,
  })
}

/**
 * TreeDataProvider
 */
const TDP = {
  addPeerWorkspace: (folder: vscode.WorkspaceFolder) => {
    const fPath = folder.uri?.path
    folders[fPath] = folder.name
    CΩStore.peerFS[fPath] = {}
    logger.log('TDP: addPeerWorkspace', fPath)
    return TDP
  },

  removePeerWorkspace: (folder: vscode.WorkspaceFolder) => {
    const fPath = folder.uri.path
    delete folders[fPath]
    delete CΩStore.peerFS[fPath]
    logger.log('TDP: removePeerWorkspace', fPath)
    TDP.refresh()
  },

  clearWorkspace: () => {
    folders = {}
  },

  getTreeItem: (el: vscode.TreeItem) => {
    return el
  },

  // theoretically we should only get files, not any empty folders, due to the way diffs are being managed (empty folders are ignored)
  getChildren: (el: any) => {
    if (!folders) return []
    if (!el) return makeWSItems()
    const { peerFS } = CΩStore
    const { fpath, wsFolder } = el
    // eslint-disable-next-line no-useless-escape
    const parts = fpath.split(/[\\\/]/).filter((a: string) => a)
    const tree = parts.reduce((acc: any, p: string) => acc[p], peerFS[wsFolder])

    try {
      return Object.keys(tree).map(toTDItem({ wsFolder, tree, fpath }))
    } catch (err) {
      console.log('TDP: err (fpath, wsFolder, parts, tree)', err, fpath, wsFolder, parts, tree)
    }

    return []

    function makeWSItems() {
      return Object.keys(folders).map(wsFolder => toTDItem({ wsFolder, tree: {}, fpath: '' })(folders[wsFolder]))
    }
  },

  onDidChangeTreeData: dataChangeEvent.event,

  refresh: () => {
    dataChangeEvent.fire(true)
  },
}

class TDItem extends TreeItem {
  wsFolder: vscode.WorkspaceFolder
  fpath: string

  constructor(data: any) {
    const { label, wsFolder, fpath, collapsibleState, command } = data
    super(label, collapsibleState)
    if (command) this.command = command
    this.wsFolder = wsFolder
    this.fpath = fpath
    this.tooltip = '' // TODO: maybe show a list of names of contributors for this item
    this.description = '' // TODO: maybe show the number of contributors changing this file / folder
  }
}

export {
  TDP,
  TDItem,
}
