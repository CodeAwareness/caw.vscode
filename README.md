# Code Awareness (cΩ)

Low noise collaboration.
Enjoy coding with a team and learn from your peers.

## Features

- File diffs awareness between you and your team members
- Quick diffs between you and your peers, for any file
- List of files changed by your peers is available in the SCM tree
- Support for quick branch diffs on the active file
- Swarm Authorization. More details to come soon on our [website](https://codeawareness.com).

Note about security: I'm using an original git repo authorization mechanism I call "Swarm Authorization". To prove that you have access to a repository, the local service sends the latest commit SHA in your repo to the Code Awareness API. If this is the same as the SHA at your peers, then Code Awareness authorizes you to be in the same group with your peers.

Note about privacy and intellectual property: Code Awareness does not require access to your repository in the cloud. As you can tell by looking at the Code Awareness (cΩ) local service code, we simply gather code diffs between you and your peers. These diffs are stored temporarily on our servers, to allow us to build the right diff trees between team members, after which they are deleted.

## Requirements

1. Install the [Code Awareness local service](https://github.com/CodeAwareness/cA.localservice)
2. When developing, you'll also need the [Code Awareness VSCode panel](https://github.com/CodeAwareness/cA.vscode.panel).

## Extension Settings

## Known Issues

Beta release. Much work remaining to be done.

## Release Notes

Code Awareness allows you to see your peer's changes (diffs). When editing a file, you will see orange markers next to the scrollbar (the gutter indicators). These are the points where other people have made changes to this file, in their branch, or perhaps in the same branch. This is especially useful for a form of Trunk Based Development, where devs work on few branches or even a single branch. When you open the Code Awareness panel (click on Code Awareness in the status bar), you'll also see those lines highlighted in light blue, and you'll be able to see the people who have made those changes. Click on their portrait to see the diffs between you and them. You can also click on any local branch (shown in the panel) to see the diffs between your file and the same file in that branch.

### 1.0.0

First open-source release.

- support for trunk based, single branch development (alpha)
- diff-awareness between you and your team members
- quick diffs between you and your peers, for any file
- list of files changed by your peers is available in the left SCM tree.
- support for branch diffs on the active file
- i18n support for editor language

Limitations:

- at this time, the API itself is closed-source, as we're trying to get some funding to expand our efforts;
- there is no support yet for cloud workspaces (file that are not local).
- deleted files will not properly show in the SCM tree

-----------------------------------------------------------------------------------------------------------

# Run in production mode

Install the extension from the VSCode marketplace.

To load the nightly prebuilt extension, download it from [https://ext.codeawareness.com/nightly/code-awareness-nightly.vsix](https://ext.codeawareness.com/nightly) and load it in VSCode: go to the Extention explorer, click the ellipsis menu at the top, and select "Install from VSIX".

Install and run the [Code Awareness local service](https://github.com/CodeAwareness/cA.localservice).

# Development

## Setup

- install the [Code Awareness local service](https://github.com/CodeAwareness/cA.localservice)
- install [Code Awareness VSCode panel](https://github.com/CodeAwareness/cA.vscode.panel)
- Run your Code Awareness local service with `yarn start`
- Run your Code Awareness panel with `yarn dev`
- Finally go to VSCode, open this source code folder, change `const DEBUG = true` in the `src/config` file, and choose Run Extension.

## Setup git to work with unicode in your filenames

`git config core.quotepath off`

After which a `git ls-files` will list the files with the approriate characters.

### Developer notes

Honestly I've never had so much headache with any software before. It's been utter hell to figure out VSCode. Here are some hickups I've encountered so far:

- WebSockets exist in Extension Development Host, but not in the regular (production) VSCode.
- NodeJS `path` module exists in production but not in the Dev Host.
- Regular windows events don't exist (such as on-close, etc). Rather a subset of events are re-implemented, or probably restricted via an interface.
- Trying to get the current path of a file on Windows returns either of the following values, depending on the planet alignment and the amount of alcohool you poured on your house plants:
     * 1. C:\Folder\Sub\fileName.ext
     * 2. c:\Folder\Sub\fileName.ext
     * 3. /c:/Folder/Sub/fileName.ext
     * 4. /C:/Folder/Sub/fileName.ext

At the time of writing this, I'm close to wanting to start my own code editor project. However, VSCode is a beloved editor with a huge audience, so I'm doing my best to contain my frustrations. Any donations you may be inclined to send my way will be used for therapy.

**Enjoy!**

TODO:
- Include anything this extension adds to VS Code settings through the `contributes.configuration` extension point.
- Projects may contain a .cΩ file, in which the user can store their own personalised settings. These .cΩ files function in a similar way to .eslintrc and .editorconfig files
- Cleanup open resources (temp files, sockets, stale projects due to restarting VSCode, etc,)
- Make the decorations insert delay a configurable value (currently at 2000ms)
- Try to optimize the diff uploading mechanism, to only send any changes made since the last upload
- Try to catch file changes made by the OS, such as when `git checkout` or `cp` commands are run in the terminal
- Try to figure out how to detect dev-mode vs prod-mode in VSCode extension

