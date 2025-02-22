import * as vscode from 'vscode';

export const getActiveEditorContent = () => {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    if(editor.document) {
      return editor.document.getText();
    }
  }

  return undefined;
};

export const listenForEditorChanges = () => {

  // Wait for editor to be ready
  const disposable = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
    if (editor) {
      // Register the document change listener
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event?.document === editor.document) {
          const updatedContent = event.document.getText();
          console.log('Document Updated:', updatedContent.substring(0, 50) + '...');
          
          event.contentChanges.forEach((change) => {
            console.log('Change offset:', change.rangeOffset);
            console.log('Change text:', change.text);
          });
        }
      });
    }
  });

  if(vscode.window.activeTextEditor) {
    vscode.workspace.onDidChangeTextDocument((event) => {
      // if(!event) {
      //   return;
      // }
  
      if(vscode.window.activeTextEditor && event?.document === vscode.window.activeTextEditor.document) { 
        const updatedContent = event.document.getText();
        console.log('editor changed and Document Updated', updatedContent.substring(0, 50) + '...');
      }
  
      event.contentChanges.forEach((change) => {
        console.log('Change offset:', change.rangeOffset);
        console.log('Change text:', change.text);
      });
    });

  }

};
