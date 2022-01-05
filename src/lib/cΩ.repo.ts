import * as vscode from 'vscode'
import { CΩ_SCHEMA } from '@/config'

type TNamePath = {
  name: string
  path: string
}

const CΩRepository = {
  createFrom(wsFolder: vscode.WorkspaceFolder) {
    return new Repository(wsFolder)
  },
}

class Repository {
  root: string

  constructor(wsFolder: vscode.WorkspaceFolder) {
    this.root = wsFolder.uri.path
  }

  provideOriginalResource(options: TNamePath) {
    const { name, path } = options
    if (!name) return ''
    return vscode.Uri.parse(`${CΩ_SCHEMA}:${name}/${path}`)
  }

  get workspaceFolder() {
    return this.root
  }
}

export {
  CΩRepository,
}
