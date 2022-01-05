import { vscodeOriginalResource } from '../vscode/vscode'

const CΩRepository = {
  createFrom(wsFolder) {
    return new Repository(wsFolder)
  },
}

class Repository {
  constructor(wsFolder) {
    this.root = wsFolder
  }

  provideOriginalResource({ name, path }) {
    if (!name) return ''
    return vscodeOriginalResource({ name, path })
  }

  get workspaceFolder() {
    return this.root
  }
}

export {
  CΩRepository,
}
