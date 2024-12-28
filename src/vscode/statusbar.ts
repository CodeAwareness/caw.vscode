import { window, StatusBarAlignment } from 'vscode'

let statusBarItem: any = null
let pulse = 0

export const CAWStatusbar = {

  init: () => {
    if (!statusBarItem) {
      statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 100)
      statusBarItem.show()
    }

    CAWStatusbar.working('loading...') // TODO: this doesn't work. Is it an older API?
    CAWStatusbar.live()
  },

  working: (workingMsg = 'Working on it...') => {
    statusBarItem.text = `${pulse++} ${workingMsg}...`
    statusBarItem.tooltip = 'In case if it takes long time, check if your Code Awareness local service is running.'
  },

  live: () => {
    statusBarItem.text = 'CodeAwareness'
    statusBarItem.command = 'caw.toggle'
    statusBarItem.tooltip = 'Toggle CodeAwareness panel'
  },

  dispose: () => {
    statusBarItem.dispose()
  },
}
