import * as vscode from 'vscode';
import axios from 'axios';
import ollama from 'ollama';
import * as acorn from 'acorn';
import * as ts from 'typescript';

export const getActiveEditorContent = () => {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    if (editor.document) {
      return editor.document.getText();
    }
  }

  return undefined;
};

export const listenForEditorChanges = () => {
  // Wait for editor to be ready
  const disposable = vscode.window.onDidChangeActiveTextEditor(
    async (editor) => {
      if (editor) {
        // Register the document change listener
        vscode.workspace.onDidChangeTextDocument((event) => {
          if (event?.document === editor.document) {
            const updatedContent = event.document.getText();
            console.log(
              'Document Updated:',
              updatedContent.substring(0, 50) + '...'
            );

            event.contentChanges.forEach((change) => {
              console.log('Change offset:', change.rangeOffset);
              console.log('Change text:', change.text);
            });
          }
        });
      }
    }
  );

  if (vscode.window.activeTextEditor) {
    vscode.workspace.onDidChangeTextDocument((event) => {
      // if(!event) {
      //   return;
      // }

      if (
        vscode.window.activeTextEditor &&
        event?.document === vscode.window.activeTextEditor.document
      ) {
        const updatedContent = event.document.getText();
        console.log(
          'editor changed and Document Updated',
          updatedContent.substring(0, 50) + '...'
        );
      }

      event.contentChanges.forEach((change) => {
        console.log('Change offset:', change.rangeOffset);
        console.log('Change text:', change.text);
      });
    });
  }
};

// async function generateComment(code: string) {
//   try {
//     const response = await axios.post('http://localhost:3000/generateComment', { code });
//     return response.data.comment;
//   } catch (error) {
//     console.error('Error generating comment:', error);
//     return null;
//   }
// }

async function generateComment(code: string) {
  try {
    const response = await ollama.chat({
      model: 'llama2:7b-chat',
      messages: [
        {
          role: 'user',
          content: `Generate a brief comment explaining this code:\n${code}`,
        },
      ],
    });

    return response.message.content;
  } catch (error) {
    console.error('Error generating comment:', error);
    return null;
  }
}

export function generateCommentFromEditor() {
  vscode.languages.registerInlineCompletionItemProvider(
    { pattern: '**' },
    {
      provideInlineCompletionItems: async (
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
      ): Promise<vscode.InlineCompletionItem[]> => {
        const line = document.lineAt(position.line);
        if (line.isEmptyOrWhitespace) {
          return [];
        }

        const code = await getCodeAroundPosition(document, position);
        const comment = code ? await generateComment(code) : '';
        
        return [new vscode.InlineCompletionItem(comment ?? '')];
      }
    }
  );
}

const getCodeAroundPosition = async (
  document: vscode.TextDocument,
  position: vscode.Position
) => {
  const languageId = document.languageId;

  try {
    let ast: any;
    let code = '';

    switch (languageId) {
      case 'typescript':
        ast = ts.createSourceFile(
          document.fileName,
          document.getText(),
          ts.ScriptTarget.Latest,
          true
        );
        code = traverseTSAst(ast, document, position);
        break;
      case 'javascript':
        ast = acorn.parse(document.getText(), {
          sourceType: 'module',
          ecmaVersion: 'latest',
        });
        code = traverseJSAst(ast, document, position);
        break;
    }
  } catch (error) {
    console.error('Error getting code around position:', error);
    return null;
  }
};

const traverseJSAst = (
  ast: ts.SourceFile,
  document: vscode.TextDocument,
  position: vscode.Position
) => {
  let foundNode: any = null;
  function traverse(node: any, position: vscode.Position) {
    if (node.type === 'Program' || node.type === 'BlockStatement') {
      node.body.forEach((child: any) => traverse(child, position));
    } else if (
      node.start <= document.offsetAt(position) &&
      node.end >= document.offsetAt(position)
    ) {
      foundNode = node;
    }
  }

  traverse(ast, position);
  if (foundNode) {
    let contextNode = foundNode;
    while (contextNode.type !== 'FunctionDeclaration') {
      contextNode = contextNode.parent;
    }

    if (contextNode.type === 'FunctionDeclaration' || contextNode.type === 'IfStatement' || contextNode.type === 'WhileStatement' || contextNode.type === 'ForStatement') {
      return document.getText(
        new vscode.Range(
          document.positionAt(contextNode.start),
          document.positionAt(contextNode.end)
        )
      );
    } else {
      return document.lineAt(position.line).text;
    }
  }

  return document.lineAt(position.line).text;
};

const traverseTSAst = (
  ast: ts.SourceFile,
  document: vscode.TextDocument,
  position: vscode.Position
) => {
  let foundNode: ts.Node | undefined;
  
  function visit(node: ts.Node) {
    if (document.offsetAt(position) >= node.getStart() && 
        document.offsetAt(position) <= node.getEnd()) {
      foundNode = node;
    }
    ts.forEachChild(node, visit);
  }

  visit(ast);

  if (foundNode) {
    let contextNode: ts.Node = foundNode;
    while (contextNode.parent && 
           !ts.isFunctionDeclaration(contextNode) &&
           !ts.isMethodDeclaration(contextNode)) {
      contextNode = contextNode.parent;
    }

    if (ts.isFunctionDeclaration(contextNode) || 
        ts.isMethodDeclaration(contextNode) ||
        ts.isIfStatement(contextNode) ||
        ts.isWhileStatement(contextNode) ||
        ts.isForStatement(contextNode)) {
      return document.getText(
        new vscode.Range(
          document.positionAt(contextNode.getStart()),
          document.positionAt(contextNode.getEnd())
        )
      );
    } else {
      return document.lineAt(position.line).text;
    }
  }
  
  return document.lineAt(position.line).text;
};
