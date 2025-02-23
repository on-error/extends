import * as vscode from 'vscode';
import axios from 'axios';
// import ollama from 'ollama';
import * as acorn from 'acorn';
import * as ts from 'typescript';
import Parser, { Language } from "tree-sitter";
import Python from "tree-sitter-python";
import { generateDocstrings } from './helper/open-ai';



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
    console.log(code);
    return generateDocstrings(code);

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
        console.log('generatecomment from editor --- > code ---> ', code);
        const comment = code ? await generateComment(code) : '';
        console.log('generatecomment from editor --- > comment ---> ', comment);

        return [
          {
            insertText: ` // ${comment}`,
            range: new vscode.Range(position, position),
            command: {
              title: 'Insert Comment',
              command: 'extends.insertComment',
              arguments: [comment, position],
            },
          },
        ];
      },
    }
  );
}

const getCodeAroundPosition = async (
  document: vscode.TextDocument,
  position: vscode.Position
) => {
  const languageId = document.languageId;
  console.log('LanguageId', languageId);
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
        console.log('TS AST ---> ', ast);
        code = traverseTSAst(ast, document, position);
        break;
      case 'javascript':
        ast = acorn.parse(document.getText(), {
          sourceType: 'module',
          ecmaVersion: 'latest',
        });
        console.log('JS AST ---> ', ast);

        code = traverseJSAst(ast, document, position);
        console.log('code JS ---->', code);
        break;
      case "python":
        console.log('handling python code');
        const parser = new Parser();
        parser.setLanguage(Python as unknown as Language);
        ast = parser.parse(document.getText());
        code = traversePythonAst(ast, document, position);
        break;
    }

    return code;
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
      console.log('traverse node', node);
      node.body.forEach((child: any) => traverse(child, position));
    } else if (
      node.start <= document.offsetAt(position) &&
      node.end >= document.offsetAt(position)
    ) {
      console.log('found node', node);

      foundNode = node;
    } else {
      console.log("Node not found");
      return;
    }
  }

  traverse(ast, position);
  if (foundNode) {
    let contextNode = foundNode;
    while (contextNode.type !== 'FunctionDeclaration') {
      contextNode = contextNode.parent;
    }
    console.log('contextNode', contextNode);
    if (
      contextNode.type === 'FunctionDeclaration' ||
      contextNode.type === 'IfStatement' ||
      contextNode.type === 'WhileStatement' ||
      contextNode.type === 'ForStatement'
    ) {
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
    if (
      document.offsetAt(position) >= node.getStart() &&
      document.offsetAt(position) <= node.getEnd()
    ) {
      foundNode = node;
    }
    ts.forEachChild(node, visit);
  }

  visit(ast);

  if (foundNode) {
    let contextNode: ts.Node = foundNode;
    while (
      contextNode.parent &&
      !ts.isFunctionDeclaration(contextNode) &&
      !ts.isMethodDeclaration(contextNode)
    ) {
      contextNode = contextNode.parent;
    }

    if (
      ts.isFunctionDeclaration(contextNode) ||
      ts.isMethodDeclaration(contextNode) ||
      ts.isIfStatement(contextNode) ||
      ts.isWhileStatement(contextNode) ||
      ts.isForStatement(contextNode)
    ) {
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

const traversePythonAst = (
  ast: Parser.Tree,
  document: vscode.TextDocument,
  position: vscode.Position
): string => {
  let foundNode: Parser.SyntaxNode | null = null;
  const cursorOffset = document.offsetAt(position);

  function traverse(node: Parser.SyntaxNode) {
    if (node.startIndex <= cursorOffset && node.endIndex >= cursorOffset) {
      foundNode = node as Parser.SyntaxNode; // Explicitly cast
    }
    for (const child of node.children) {
      traverse(child);
    }
  }

  traverse(ast.rootNode);

  while (
    foundNode !== null &&
    (foundNode as Parser.SyntaxNode).type &&
    !["function_definition", "class_definition", "if_statement", "for_statement", "while_statement"].includes(
      (foundNode as Parser.SyntaxNode).type
    )
  ) {
    foundNode = (foundNode as Parser.SyntaxNode).parent ?? null;
  }

  return foundNode
    ? document.getText(
        new vscode.Range(
          document.positionAt(foundNode.startIndex),
          document.positionAt(foundNode.endIndex)
        )
      )
    : document.lineAt(position.line).text;
};
export const insertComment = (comment: string, position: vscode.Position) => {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    editor.edit((editBuilder) => {
      editBuilder.insert(position, `//${comment}`);
    });
  }
};
