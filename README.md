# CPP_OUT to CPP_IN Copier

A small VS Code extension that adds a **Copy to CPP_IN** entry to the right-click
menu of any file that lives under a `CPP_OUT` folder. Running it copies the file
to the same relative path under a sibling `CPP_IN` folder.

## What it does

Given a file like:

```
/home/me/project/CPP_OUT/sub/dir/file.cpp
```

it copies to:

```
/home/me/project/CPP_IN/sub/dir/file.cpp
```

The `CPP_IN` folder is placed right beside `CPP_OUT` (same location), and the
relative path below `CPP_OUT` is preserved. Any missing subfolders under
`CPP_IN` are created automatically.

## Where the button shows up

The command appears when the file's path contains `CPP_OUT`:

- Right-click a file in the Explorer
- Right-click the editor tab
- Right-click inside the open editor
- Command Palette (acts on the active editor)

The menu match is intentionally loose (any path containing `CPP_OUT`). The real
check happens when you run it: it walks up from the file to the nearest folder
named exactly `CPP_OUT`. If there isn't one, you get a clear message and nothing
is copied.

## Behavior notes

- **Multi-select:** select several files in the Explorer, right-click, and all
  of them are copied.
- **Overwrites:** if a destination file already exists you are asked before it
  is replaced, with an "Overwrite All" option for batches.
- **Nearest CPP_OUT:** if a path somehow contains more than one `CPP_OUT`, the
  one closest to the file is used. To prefer the outermost instead, change
  `findCppOutDir` in `extension.js` to keep climbing and remember the last
  match rather than returning on the first.

## Run it (development)

1. Open this folder in VS Code.
2. Press `F5`. A second VS Code window ("Extension Development Host") opens with
   the extension loaded.
3. In that window, open a folder that has a `CPP_OUT` directory, right-click a
   file under it, and choose **Copy to CPP_IN**.

## Install it permanently

Option A, package and install:

```bash
npm install -g @vscode/vsce
vsce package
code --install-extension cpp-out-to-in-0.0.1.vsix
```

Option B, drop it in your extensions folder, then reload VS Code:

- Windows: `%USERPROFILE%\.vscode\extensions\cpp-out-to-in`
- macOS / Linux: `~/.vscode/extensions/cpp-out-to-in`

## Files

- `package.json` ... manifest, command, and menu contributions
- `extension.js` ... the copy logic
- `.vscode/launch.json` ... lets you press F5 to test
