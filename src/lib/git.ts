import { exec as cpExec } from 'child_process'

import { logger } from './logger'

const isWindows = !!process.env.ProgramFiles

function exec(command, options = {}) {
  // TODO: maybe use spawn instead of exec (more efficient since it doesn't spin up any shell)
  return new Promise((resolve, reject) => {
    cpExec(command, options, (error, stdout, stderr) => {
      // if (stderr) reject(stderr, error) // TODO: find a better solution to actually reject when needed; we receive "error: cannot access example-submodule/null" in stderr, for submodule directories.
      if (stderr) logger.log('git exec warning or error', command, error, stderr)
      resolve(stdout)
    })
  })
}

const git = {
  gitBranches,
  gitCommand,
  gitRemotes,
}

function gitCommand(wsFolder, cmd) {
  const options = {
    env: Object.assign(process.env, { GIT_TERMINAL_PROMPT: '0' }),
    windowsHide: true,
    maxBuffer: 5242880, // TODO: ensure this is enough, or do spawn / streaming instead
  }
  if (wsFolder) {
    logger.log('GIT: isWindows? (wsFolder)', isWindows, wsFolder)
    /**
     * Windows tipsy notes:
     * You can have folder path reported by Windows / VSCode with either of the following patterns, depending on the planet alignment and the amount of alcohool you poured on your house plants:
     * 1. C:\Folder\Sub\fileName.ext
     * 2. c:\Folder\Sub\fileName.ext
     * 3. /c:/Folder/Sub/fileName.ext
     * 4. /C:/Folder/Sub/fileName.ext
     */
    options.cwd = isWindows && ['\\', '/'].includes(wsFolder[0]) ? wsFolder.substr(1).replace(/\//g, '\\') : wsFolder
  }

  logger.info('GIT exec', cmd, 'with options', options)
  return exec(cmd, options)
}

function gitRemotes(wsFolder) {
  return git.gitCommand(wsFolder, 'git remote -v')
    .then(stdout => {
      const outLines = stdout.split('\n')
      if (!outLines.length) return logger.info('no output from git remote -v')
      logger.log('GIT: gitRemotes output', stdout)
      const reOrigin = /github.com[:/](.+)(\.git | )/.exec(
        outLines.filter(line => /^origin/.test(line))[0],
      )
      if (!reOrigin) {
        return logger.info('GIT Not a cloud repository', wsFolder, stdout)
      }
      const origin = reOrigin[1].trim().replace(/.git$/, '')

      return origin
    })
}

function gitBranches(wsFolder) {
  return git.gitCommand(wsFolder, 'git branch --no-color')
    .then(stdout => {
      const lines = stdout.split('\n')
      const branch = lines.filter(l => /^\*/.test(l))[0].substr(2)
      const branches = lines.map(line => line.replace('* ', '')).filter(a => a)
      return { branch, branches }
    })
}

export default git
