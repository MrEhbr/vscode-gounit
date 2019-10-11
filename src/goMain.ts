// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as goGenerateTests from './goGenerateTests';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(ctx: vscode.ExtensionContext) {
	ctx.subscriptions.push(vscode.commands.registerCommand('gounit.gen.file', () => {
		goGenerateTests.generateTestCurrentFile();
	}));

	ctx.subscriptions.push(vscode.commands.registerCommand('gounit.gen.function', () => {
		goGenerateTests.generateTestCurrentFunction();
	}));

}

// this method is called when your extension is deactivated
export function deactivate() { }
