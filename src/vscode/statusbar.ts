import { window, StatusBarAlignment } from 'vscode'

let statusBarItem: any = null

export const CΩStatusbar = {

  init: () => {
    if (!statusBarItem) {
      statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 100)
      statusBarItem.show()
    }

    CΩStatusbar.working('loading...')
    CΩStatusbar.live()
  },

  working: (workingMsg = 'Working on it...') => {
    statusBarItem.text = `$(pulse) ${workingMsg}`
    statusBarItem.tooltip = 'In case if it takes long time, try to close all browser window.'
  },

  live: () => {
    statusBarItem.text = 'CodeAwareness'
    statusBarItem.command = 'CΩ.toggle'
    statusBarItem.tooltip = 'Toggle CodeAwareness panel'
  },

  dispose: () => {
    statusBarItem.dispose()
  },
}
