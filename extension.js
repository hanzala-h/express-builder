const { randomInt } = require('crypto');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const vscode = require('vscode');

function activate(context) {
	let disposable = vscode.commands.registerCommand('express-builder.build', async () => {
		const folder = await vscode.window.showOpenDialog({
			canSelectFolders: true,
			canSelectMany: false,
			openLabel: 'Select Project Directory'
		});

		if (!folder || folder.length === 0) {
			vscode.window.showErrorMessage('No folder selected');
			return;
		}

		const root = folder[0].fsPath;

		const appJS = `const express = require('express');

const dbgr = require('debug')('development:app');
const db = require('./config/mongoose-connection');

const app = express();

app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.listen(3000, function () {
    dbgr('Server started at http://localhost:3000');
});
`;

		const baseCSS = `@tailwind base;
@tailwind components;
@tailwind utilities;`;

		const mongooseConnectionJS = `const mongoose = require('mongoose');
const config = require('config');
const dbgr = require('debug')('development:mongoose');

const dbUri = config.get('mongoURI');
const dbName = config.get('database');

mongoose.connect(\`\${dbUri}/\${dbName}\`, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  dbgr('MongoDB connected successfully!');
})
.catch(err => {
  dbgr(\`MongoDB connection error: \${err}\`);
});

module.exports = mongoose.Connection;
`;
		const n = randomInt(10000);

		const developmentJSON = `{
	"mongoURI": "mongodb://127.0.0.1:27017",
	"database": "database${n}"
}`;

		const struct = ['config', 'controllers', 'middlewares', 'models', 'public', 'routes', 'utils', 'views', 'app.js'];

		struct.forEach(s => {
			if (s === 'app.js') {
				fs.writeFile(path.join(root, s), appJS, err => {
					if (err) {
						vscode.window.showErrorMessage(`Error writing file ${s}: ${err.message}`);
					}
				});
			} else {
				fs.mkdir(path.join(root, s), { recursive: true }, err => {
					if (err) {
						vscode.window.showErrorMessage(`Error creating directory ${s}: ${err.message}`);
					} else {

						if (s === 'config') {
							const configFiles = ['development.json', 'mongoose-connection.js'];

							configFiles.forEach((file, idx) => {
								let data = idx === 1 ? mongooseConnectionJS : developmentJSON;
								fs.writeFile(path.join(root, s, file), data, err => {
									if (err) {
										vscode.window.showErrorMessage(`Error creating file ${file} in ${s}: ${err.message}`);
									}
								});
							});
						}

						if (s === 'public') {
							const publicDirs = ['images', 'stylesheets', 'javascripts'];

							publicDirs.forEach(dir => {
								fs.mkdir(path.join(root, s, dir), { recursive: true }, err => {
									if (err) {
										vscode.window.showErrorMessage(`Error creating directory ${dir} in ${s}: ${err.message}`);
									} else {

										if (dir === 'stylesheets') {
											const cssPath = path.join(root, s, dir, 'base.css');
											fs.writeFile(cssPath, baseCSS, err => {
												if (err) {
													vscode.window.showErrorMessage(`Error writing file base.css: ${err.message}`);
												}
											});
										}
									}
								});
							});

							exec('npm init -y', { cwd: root }, (err, stdout, stderr) => {
								if (err) {
									vscode.window.showErrorMessage(`Error initializing npm: ${err.message}`);
								} else {
									if (stderr) {
										vscode.window.showErrorMessage(`NPM initialization stderr: ${stderr}`);
									}

									const packageJsonPath = path.join(root, 'package.json');
									fs.readFile(packageJsonPath, 'utf8', (err, data) => {
										if (err) {
											vscode.window.showErrorMessage(`Error reading package.json: ${err.message}`);
											return;
										}

										const packageJson = JSON.parse(data);
										packageJson.scripts = {
											...packageJson.scripts,
											"build:css": "npx tailwindcss -i ./public/stylesheets/base.css -o ./public/stylesheets/main.css --watch",
											"env": "$env:DEBUG='development:*'",
										};

										fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), err => {
											if (err) {
												vscode.window.showErrorMessage(`Error writing package.json: ${err.message}`);
											}
										});
									});

									exec('npm i express ejs mongoose multer bcrypt jsonwebtoken cookie-parser debug config', { cwd: root }, (err, stdout, stderr) => {
										if (err) {
											vscode.window.showErrorMessage(`Error installing dependencies: ${err.message}`);
										} else {
											if (stderr) {
												vscode.window.showErrorMessage(`Dependency installation stderr: ${stderr}`);
											}

											exec('npm i -D tailwindcss', { cwd: root }, (err, stdout, stderr) => {
												if (err) {
													vscode.window.showErrorMessage(`Error installing TailwindCSS: ${err.message}`);
												} else {
													if (stderr) {
														vscode.window.showErrorMessage(`TailwindCSS installation stderr: ${stderr}`);
													}

													exec('npx tailwindcss init', { cwd: root }, (err, stdout, stderr) => {
														if (err) {
															vscode.window.showErrorMessage(`Error initializing TailwindCSS: ${err.message}`);
														} else {
															vscode.window.showInformationMessage('Project structure created successfully!');
															if (stderr) {
																vscode.window.showErrorMessage(`TailwindCSS initialization stderr: ${stderr}`);
															}
														}
													});
												}
											});
										}
									});
								}
							});
						}
					}
				});
			}
		});
	});

	context.subscriptions.push(disposable);
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
};
