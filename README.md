# codeAwareness (cΩ)

## Features

Low noise collaboration.
Enjoy coding with a team and learn from your peers.

- File diffs awareness between you and your team members
- Quick diffs between you and your peers, for any file
- List of files changed by your peers is available in the left SCM tree
- Support for branch diffs on the active file
- Swarm Authorization. More details to come soon on our [website](https://codeawareness.com).

Note about security: we're using an original git repo authorization mechanism, we call Swarm Authorization. To prove that you have access to a repository, the local service sends us the latest commit SHA in your repo. If this is the same as the SHA at your peers, then we authorize you to be in the same group with your peers.

Note about privacy and intellectual property: Code Awareness does not require access to your repository in the cloud. As you can tell by looking at the Code Awareness (cΩ) local service code, we simply gather code diffs between you and your peers. These diffs are stored temporarily on our servers, to allow us to build the right diff trees between team members.

## Requirements

Make sure you install the [Code Awareness local service](https://github.com/CodeAwareness/cA.localservice) first.
When developing, you'll also need the [Code Awareness VSCode panel](https://github.com/CodeAwareness/cA.vscode.panel).

## Extension Settings

TODO:
- Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

## Known Issues

Beta release. Much work remaining to be done.

## Release Notes

Code Awareness allows you to see your peer's changes (diffs). When editing a file, you will see orange markers next to the scrollbar (the gutter indicators). These are the points where other people have made changes to this file, in their branch, or perhaps in the same branch (trunk based development style). When you open the Code Awareness panel (click on Code Awareness in the status bar), you'll also see those lines highlighted in light blue, and you'll be able to see the people who have made those changes. Click on their portrait to see the diffs between you and them. You can also click on any local branch (shown in the panel) to see the diffs between your file and the same file in that branch.

### 1.0.0

First open-source release.

- support for trunk based development (alpha)
- file diffs awareness between you and your team members
- quick diffs between you and your peers, for any file
- list of files changed by your peers is available in the left SCM tree.
- support for branch diffs on the active file

Limitations:

- at this time, the API itself is closed-source, as we're trying to get some funding to expand our efforts;
- there is no support yet for cloud workspaces (file that are not local).

-----------------------------------------------------------------------------------------------------------

# Run in production mode

To load a prebuilt extension, simply download it from [https://ext.codeawareness.com/code-awareness-0.0.2.vsix](https://ext.codeawareness.com/code-awareness-0.0.2.vsix) and load it in VSCode, by going to the Extention explorer, click the ellipsis menu at the top, and select "Install from VSIX"

# Development

## Setup

- install the [Code Awareness local service](https://github.com/CodeAwareness/cA.localservice)
- install [Code Awareness VSCode panel](https://github.com/CodeAwareness/cA.vscode.panel)
- Run your cΩ local service with `yarn start`
- Run your cΩ panel with `yarn dev`
- Finally go to VSCode, open this source code folder, change `const DEBUG = true` in the `src/config` file, and choose Run Extension.

## Setup git to work with unicode in your filenames

`git config core.quotepath off`

After which a `git ls-files` will list the files with the approriate characters.

## Working with Markdown

**Note:** You can author your README using Visual Studio Code.  Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux)
* Toggle preview (`Shift+CMD+V` on macOS or `Shift+Ctrl+V` on Windows and Linux)
* Press `Ctrl+Space` (Windows, Linux) or `Cmd+Space` (macOS) to see a list of Markdown snippets

### For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
