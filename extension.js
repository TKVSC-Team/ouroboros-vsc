const vscode = require('vscode');
const path = require('path');

/**
 * Climb from a file path up through its ancestors and return the absolute path
 * of the nearest directory named exactly "CPP_OUT", or null if there isn't one.
 *
 * "Nearest" means the CPP_OUT closest to the file. If you would rather use the
 * outermost CPP_OUT, keep climbing and remember the last match instead of
 * returning on the first one.
 */
function findCppOutDir(filePath) {
  let cur = path.dirname(filePath);
  while (true) {
    if (path.basename(cur) === 'CPP_OUT') {
      return cur;
    }
    const parent = path.dirname(cur);
    if (parent === cur) {
      return null; // reached the filesystem root without a match
    }
    cur = parent;
  }
}

async function pathExists(uri) {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Copy a single file from somewhere under CPP_OUT to the same relative location
 * under a sibling CPP_IN folder.
 *
 * overwriteState is a shared { value: boolean } so an "Overwrite All" choice can
 * carry across a multi-file selection.
 */
async function copyOne(uri, overwriteState) {
  const filePath = uri.fsPath;

  const cppOutDir = findCppOutDir(filePath);
  if (!cppOutDir) {
    return { ok: false, file: filePath, reason: 'No CPP_OUT folder found above this file.' };
  }

  // CPP_IN sits beside CPP_OUT, at the same location.
  const cppInDir = path.join(path.dirname(cppOutDir), 'CPP_IN');

  // Path of the file relative to CPP_OUT, e.g. "sub/dir/file.cpp".
  const rel = path.relative(cppOutDir, filePath);
  const destPath = path.join(cppInDir, rel);
  const destUri = vscode.Uri.file(destPath);

  // Make sure the destination subdirectories exist (recursive, idempotent).
  await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(destPath)));

  // Prompt before clobbering an existing destination file.
  if (await pathExists(destUri) && !overwriteState.value) {
    const choice = await vscode.window.showWarningMessage(
      `"${path.basename(destPath)}" already exists in CPP_IN. Overwrite?`,
      { modal: true },
      'Overwrite',
      'Overwrite All'
    );
    if (choice === 'Overwrite All') {
      overwriteState.value = true;
    } else if (choice !== 'Overwrite') {
      return { ok: false, file: filePath, reason: 'Skipped (already exists).' };
    }
  }

  await vscode.workspace.fs.copy(uri, destUri, { overwrite: true });
  return { ok: true, file: filePath, dest: destPath };
}

function activate(context) {
  const disposable = vscode.commands.registerCommand(
    'cppOutToIn.copyToIn',
    async (uri, uris) => {
      // Figure out what to act on. VS Code passes the clicked resource as `uri`
      // and, for an explorer multi-selection, the full set as `uris`. When run
      // from the Command Palette neither is set, so fall back to the active editor.
      let targets = [];
      if (Array.isArray(uris) && uris.length > 0) {
        targets = uris;
      } else if (uri) {
        targets = [uri];
      } else if (vscode.window.activeTextEditor) {
        targets = [vscode.window.activeTextEditor.document.uri];
      }

      targets = targets.filter((u) => u && u.scheme === 'file');
      if (targets.length === 0) {
        vscode.window.showErrorMessage('Copy to CPP_IN: no file to copy.');
        return;
      }

      const overwriteState = { value: false };
      const results = [];
      for (const t of targets) {
        try {
          results.push(await copyOne(t, overwriteState));
        } catch (err) {
          const reason = (err && err.message) ? err.message : String(err);
          results.push({ ok: false, file: t.fsPath, reason });
        }
      }

      const copied = results.filter((r) => r.ok);
      const failed = results.filter((r) => !r.ok);

      if (copied.length === 1 && failed.length === 0) {
        vscode.window.showInformationMessage(
          `Copied to CPP_IN: ${vscode.workspace.asRelativePath(copied[0].dest)}`
        );
      } else if (copied.length > 0) {
        vscode.window.showInformationMessage(
          `Copied ${copied.length} file(s) to CPP_IN.` +
            (failed.length ? ` ${failed.length} skipped/failed.` : '')
        );
      }

      if (failed.length > 0) {
        vscode.window.showWarningMessage(
          'Copy to CPP_IN issues:\n' +
            failed.map((f) => `\u2022 ${path.basename(f.file)}: ${f.reason}`).join('\n')
        );
      }
    }
  );

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };
