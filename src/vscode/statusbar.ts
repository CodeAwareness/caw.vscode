import { window, StatusBarAlignment } from 'vscode'

let statusBarItem: any = null

export const CAWStatusbar = {

  init: () => {
    if (!statusBarItem) {
      statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 100)
      statusBarItem.show()
    }

    CAWStatusbar.working('loading...')
    CAWStatusbar.live()
  },

  working: (workingMsg = 'Working on it...') => {
    statusBarItem.text = `$(pulse) ${workingMsg}`
    statusBarItem.tooltip = 'In case if it takes long time, try to close all browser window.'
  },

  live: () => {
    statusBarItem.text = 'CodeAwareness'
    statusBarItem.command = 'CAW.toggle'
    statusBarItem.tooltip = 'Toggle CodeAwareness panel'
  },

  dispose: () => {
    statusBarItem.dispose()
  },
}
