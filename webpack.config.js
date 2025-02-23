//@ts-check

'use strict';

const path = require('path');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
	target: 'node', // VS Code extensions run in a Node.js context
	mode: 'none', // Keep source code as close to the original as possible

	entry: './src/extension.ts', // Entry point
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'extension.js',
		libraryTarget: 'commonjs2',
	},
	externals: {
		vscode: 'commonjs vscode', // Exclude VSCode API
		'tree-sitter': 'commonjs tree-sitter', // Exclude tree-sitter native module
		'tree-sitter-python': 'commonjs tree-sitter-python', // Exclude tree-sitter-python native module
	},
	resolve: {
		extensions: ['.ts', '.js'],
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				exclude: /node_modules/,
				use: [
					{
						loader: 'ts-loader',
					},
				],
			},
		],
	},
	devtool: 'nosources-source-map',
	infrastructureLogging: {
		level: 'log',
	},
};

module.exports = [extensionConfig];
