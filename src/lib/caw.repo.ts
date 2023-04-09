/**********************************************
 * VSCode Source Control Management: Repository
 **********************************************/
import * as vscode from 'vscode'
import config from '@/config'

type TNamePath = {
  name: string
  path: string
}

const CAWRepository = {
  createFrom(project: any) {
    return new Repository(project.root)
  },
}

class Repository {
  root: string

  constructor(root: string) {
    this.root = root
  }

  provideOriginalResource(options: TNamePath) {
    const { name, path } = options
    if (!name) return ''
    return vscode.Uri.parse(`${config.CAW_SCHEMA}:${name}/${path}`)
  }

  get workspaceFolder() {
    return this.root
  }
}

export default CAWRepository
