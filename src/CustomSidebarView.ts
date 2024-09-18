import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as jwt from 'jsonwebtoken'; 
import { readTokenFromFile, removeTokenFile, writeTokenToFile } from './tokenUtils';
import { getUsernameByUid, updateDatabase, validateTokenInDatabase, getUserDecorations } from './database';

export class CustomSidebarView implements vscode.WebviewViewProvider {
    public static readonly viewType = "pawpals.openview";
    public static readonly loginViewType = "pawpals.login";

    public _view?: vscode.WebviewView;
    private _viewType: string;

    constructor(private readonly _extensionUri: vscode.Uri, viewType: string) {
        this._viewType = viewType;
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        const storedData = readTokenFromFile();
        if (storedData) {
            this.validateToken(storedData.uid, storedData.token).then(isValid => {
                if (isValid) {
                    this._viewType = CustomSidebarView.viewType;
                    this.updateWebviewContent(webviewView.webview, CustomSidebarView.viewType);
                    this.displayWelcomeMessage(storedData.uid);
                    this.loadDecorations(storedData.uid); // Load decorations after login
                } else {
                    this._viewType = CustomSidebarView.loginViewType;
                    this.updateWebviewContent(webviewView.webview, CustomSidebarView.loginViewType);
                }
            });
        } else {
            this._viewType = CustomSidebarView.loginViewType;
            this.updateWebviewContent(webviewView.webview, CustomSidebarView.loginViewType);
        }

        setInterval(() => {
            const [errors, warnings] = this.getNumErrors();
            const message = `${errors} error(s), ${warnings} warning(s)`;
            webviewView.webview.postMessage({ command: 'update', message, errors });
        }, 1000);

        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'loginSuccess':
                    await this.handleLoginSuccess(message.token, message.uid);
                    break;
                case 'loginFailure':
                    vscode.window.showErrorMessage('Login failed: ' + message.error);
                    break;
                case 'logout':
                    await this.handleLogout();
                    break;
            }
        });
    }

    private updateWebviewContent(webview: vscode.Webview, viewType: string) {
        const fileName = viewType === CustomSidebarView.loginViewType ? 'login.html' : 'webview.html';
        const htmlFilePath = path.join(this._extensionUri.fsPath, 'resources', fileName);
        let htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');

        const stylesheetUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'assets', 'main.css')
        );

        htmlContent = htmlContent.replace('main.css', stylesheetUri.toString());
        webview.html = htmlContent;
    }

    private async handleLoginSuccess(token: string, uid: string) {
        if (!uid) {
            vscode.window.showErrorMessage('Error: User ID is missing');
            return;
        }
        
        try {
            const loginToken = jwt.sign({ uid }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '1h' });
            writeTokenToFile(uid, loginToken);
            await updateDatabase(uid, loginToken, true);
            vscode.window.showInformationMessage('Login successful');

            this._viewType = CustomSidebarView.viewType;
            if (this._view) {
                this.updateWebviewContent(this._view.webview, CustomSidebarView.viewType);
                this.loadDecorations(uid); // Load decorations after login
            }

            this.displayWelcomeMessage(uid);
        } catch (error) {
            vscode.window.showErrorMessage('Error during login handling: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    }

    public async handleLogout() {
        try {
            const storedData = readTokenFromFile();
            if (storedData) {
                const { uid } = storedData;
                removeTokenFile();
                await updateDatabase(uid, '', false);
                vscode.window.showInformationMessage('Logout successful');

                this._viewType = CustomSidebarView.loginViewType;
                if (this._view) {
                    this.updateWebviewContent(this._view.webview, CustomSidebarView.loginViewType);
                }

                this._view?.webview.postMessage({ command: 'clearWelcome' });
            } else {
                vscode.window.showErrorMessage('No token found for logout');
            }
        } catch (error) {
            vscode.window.showErrorMessage('Error during logout handling: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    }

    private async validateToken(uid: string, token: string): Promise<boolean> {
        return await validateTokenInDatabase(uid, token);
    }

    private getNumErrors(): [number, number] {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return [0, 0];
        }

        const document = activeEditor.document;
        let numErrors = 0;
        let numWarnings = 0;

        for (const diagnostic of vscode.languages.getDiagnostics(document.uri)) {
            switch (diagnostic.severity) {
                case vscode.DiagnosticSeverity.Error:
                    numErrors += 1;
                    break;
                case vscode.DiagnosticSeverity.Warning:
                    numWarnings += 1;
                    break;
            }
        }

        return [numErrors, numWarnings];
    }

    private async displayWelcomeMessage(uid: string) {
        const username = await getUsernameByUid(uid);
        if (username) {
            this._view?.webview.postMessage({ command: 'displayWelcome', username });
        }
    }

    private async loadDecorations(uid: string) {
        try {
            const decorations = await getUserDecorations(uid);
            this._view?.webview.postMessage({ command: 'updateDecorations', decorations });
        } catch (error) {
            vscode.window.showErrorMessage('Error loading decorations: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    }
}
