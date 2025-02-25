// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {
  generateCommentFromEditor,
  insertComment,
  listenForEditorChanges,
} from './utils';

let outputChannel: vscode.OutputChannel;
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "extends" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand(
    'extends.helloWorld',
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage('Hello World from extends!');
    }
  );
  context.subscriptions.push(disposable);
  // 	const insertCommentCommand = vscode.commands.registerCommand('extends.insertComment', (comment, position) => {
  // 		insertComment(comment, position);
  // });
  // listenForEditorChanges();
  // const commentProvider = generateCommentFromEditor();
  // context.subscriptions.push(commentProvider);

  // const generatedCommentCommand = vscode.commands.registerCommand(
  //   'extends.generatedComment',
  //   async () => {
  //     console.log('Generated Comment Command');
  //     try {
  //       const editor = vscode.window.activeTextEditor;
  //       if (editor) {
  //         await vscode.commands.executeCommand(
  //           'editor.action.inlineSuggest.trigger'
  //         );
  //         await vscode.commands.executeCommand(
  //           'editor.action.inlineSuggest.show'
  //         );
  //       }
  //     } catch (error) {
  //       console.error('Error triggering inline suggest:', error);
  //     }
  //   }
  // );
  // context.subscriptions.push(generatedCommentCommand);

	// outputChannel = vscode.window.createOutputChannel('My Extension');
  //   outputChannel.appendLine('Extension activated!');

  //   context.subscriptions.push(
  //       vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, {
  //           provideInlineCompletionItems: () => {
  //               outputChannel.appendLine('Inline completion triggered!');
	// 							console.log('Inline completion triggered');
  //               return [{
  //                   insertText: '// Test comment\n',
  //                   range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)),
  //               }];
  //           },
  //       })
  //   );

  const outputChannel = vscode.window.createOutputChannel('My Extension');
    outputChannel.appendLine('Extension activated!');

    context.subscriptions.push(
        vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, {
            provideInlineCompletionItems: (document, position, context, token) => {
                outputChannel.appendLine('Inline completion triggered!');
                console.log('Inline completion triggered');

                return new vscode.InlineCompletionList([
                    new vscode.InlineCompletionItem('// Test comment', new vscode.Range(position, position))
                ]);
            }
        })
    );
}

// This method is called when your extension is deactivated
export function deactivate() {}
