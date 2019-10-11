'use strict';

import cp = require('child_process');
import path = require('path');
import vscode = require('vscode');

export let outputChannel = vscode.window.createOutputChannel('GoUnit');
const generatedWord = 'Generated ';

/**
 * If current active editor has a Go file, returns the editor.
 */
function checkActiveEditor(): vscode.TextEditor | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage('Cannot generate unit tests. No editor selected.');
    return;
  }
  if (!editor.document.fileName.endsWith('.go')) {
    vscode.window.showInformationMessage('Cannot generate unit tests. File in the editor is not a Go file.');
    return;
  }
  if (editor.document.isDirty) {
    vscode.window.showInformationMessage('File has unsaved changes. Save and try again.');
    return;
  }
  return editor;
}

/**
 * Toggles between file in current active editor and the corresponding test file.
 */
export function toggleTestFile(): void {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage('Cannot toggle test file. No editor selected.');
    return;
  }
  const currentFilePath = editor.document.fileName;
  if (!currentFilePath.endsWith('.go')) {
    vscode.window.showInformationMessage('Cannot toggle test file. File in the editor is not a Go file.');
    return;
  }
  let targetFilePath = '';
  if (currentFilePath.endsWith('_test.go')) {
    targetFilePath = currentFilePath.substr(0, currentFilePath.lastIndexOf('_test.go')) + '.go';
  } else {
    targetFilePath = currentFilePath.substr(0, currentFilePath.lastIndexOf('.go')) + '_test.go';
  }
  for (const doc of vscode.window.visibleTextEditors) {
    if (doc.document.fileName === targetFilePath) {
      vscode.commands.executeCommand('vscode.open', vscode.Uri.file(targetFilePath), doc.viewColumn);
      return;
    }
  }
  vscode.commands.executeCommand('vscode.open', vscode.Uri.file(targetFilePath));
}

export function generateTestCurrentFile(): Promise<boolean> {
  const editor = checkActiveEditor();
  if (!editor) {
    return;
  }
  return generateTests({ file: editor.document.uri.fsPath },
    vscode.workspace.getConfiguration('go', editor.document.uri));
}

export async function generateTestCurrentFunction(): Promise<boolean> {
  const editor = checkActiveEditor();
  if (!editor) {
    return;
  }

  let funcName = editor.document.lineAt(editor.selection.active.line).text;
  return generateTests({
    file: editor.document.uri.fsPath,
    funcLine: editor.selection.active.line + 1,
    funcName: funcName.replace('{', '').trim(),
  }, vscode.workspace.getConfiguration('go', editor.document.uri));
}

interface Config {
  file: string;
  funcLine?: number;
  funcName?: string;
}

function generateTests(conf: Config, goConfig: vscode.WorkspaceConfiguration): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    const cmd = "gounit";

    let args: string[] = ["gen", '-i', conf.file];
    if (goConfig['gounit'].flags) {
      args = args.concat(goConfig['gounit'].flags);
    }

    if (conf.funcLine) {
      args = args.concat(['-l', conf.funcLine.toString()]);
    }

    cp.execFile(cmd, args, {}, (err, stdout, stderr) => {
      outputChannel.appendLine('Generating Tests: ' + cmd + ' ' + args.join(' '));

      try {
        if (err && (<any>err).code === 'ENOENT') {
          vscode.window.showInformationMessage("gounit is missing. install gounit: go get -u github.com/hexdigest/gounit/cmd/gounit");
          return resolve(false);
        }
        if (err) {
          console.log(err);
          outputChannel.appendLine(err.message);
          vscode.window.showInformationMessage("Cannot generate test: " + stderr);
          return reject('Cannot generate test due to errors');
        }

        let message = stdout;
        if (conf.funcLine) {
          message = `Test for ${conf.funcName} generated`;
        } else {
          message = `Test for ${conf.file.substring(conf.file.lastIndexOf('/') + 1)} generated`;
        }

        vscode.window.showInformationMessage(message);
        outputChannel.append(message);
        toggleTestFile();

        return resolve(true);
      } catch (e) {
        vscode.window.showInformationMessage(e.msg);
        outputChannel.append(e.msg);
        reject(e);
      }
    });
  });
}
