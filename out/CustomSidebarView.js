"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomSidebarView = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const jwt = __importStar(require("jsonwebtoken"));
const tokenUtils_1 = require("./tokenUtils");
const database_1 = require("./database");
class CustomSidebarView {
    constructor(_extensionUri, viewType) {
        this._extensionUri = _extensionUri;
        this._viewType = viewType;
    }
    resolveWebviewView(webviewView, _context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        const storedData = (0, tokenUtils_1.readTokenFromFile)();
        if (storedData) {
            this.validateToken(storedData.uid, storedData.token).then(isValid => {
                if (isValid) {
                    this._viewType = CustomSidebarView.viewType;
                    this.updateWebviewContent(webviewView.webview, CustomSidebarView.viewType);
                    this.displayWelcomeMessage(storedData.uid);
                    this.loadDecorations(storedData.uid); // Load decorations after login
                }
                else {
                    this._viewType = CustomSidebarView.loginViewType;
                    this.updateWebviewContent(webviewView.webview, CustomSidebarView.loginViewType);
                }
            });
        }
        else {
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
    updateWebviewContent(webview, viewType) {
        const fileName = viewType === CustomSidebarView.loginViewType ? 'login.html' : 'webview.html';
        const htmlFilePath = path.join(this._extensionUri.fsPath, 'resources', fileName);
        let htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');
        const stylesheetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'assets', 'main.css'));
        htmlContent = htmlContent.replace('main.css', stylesheetUri.toString());
        webview.html = htmlContent;
    }
    async handleLoginSuccess(token, uid) {
        if (!uid) {
            vscode.window.showErrorMessage('Error: User ID is missing');
            return;
        }
        try {
            const loginToken = jwt.sign({ uid }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '1h' });
            (0, tokenUtils_1.writeTokenToFile)(uid, loginToken);
            await (0, database_1.updateDatabase)(uid, loginToken, true);
            vscode.window.showInformationMessage('Login successful');
            this._viewType = CustomSidebarView.viewType;
            if (this._view) {
                this.updateWebviewContent(this._view.webview, CustomSidebarView.viewType);
                this.loadDecorations(uid); // Load decorations after login
            }
            this.displayWelcomeMessage(uid);
        }
        catch (error) {
            vscode.window.showErrorMessage('Error during login handling: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    }
    async handleLogout() {
        try {
            const storedData = (0, tokenUtils_1.readTokenFromFile)();
            if (storedData) {
                const { uid } = storedData;
                (0, tokenUtils_1.removeTokenFile)();
                await (0, database_1.updateDatabase)(uid, '', false);
                vscode.window.showInformationMessage('Logout successful');
                this._viewType = CustomSidebarView.loginViewType;
                if (this._view) {
                    this.updateWebviewContent(this._view.webview, CustomSidebarView.loginViewType);
                }
                this._view?.webview.postMessage({ command: 'clearWelcome' });
            }
            else {
                vscode.window.showErrorMessage('No token found for logout');
            }
        }
        catch (error) {
            vscode.window.showErrorMessage('Error during logout handling: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    }
    async validateToken(uid, token) {
        return await (0, database_1.validateTokenInDatabase)(uid, token);
    }
    getNumErrors() {
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
    async displayWelcomeMessage(uid) {
        const username = await (0, database_1.getUsernameByUid)(uid);
        if (username) {
            this._view?.webview.postMessage({ command: 'displayWelcome', username });
        }
    }
    async loadDecorations(uid) {
        try {
            const decorations = await (0, database_1.getUserDecorations)(uid);
            this._view?.webview.postMessage({ command: 'updateDecorations', decorations });
        }
        catch (error) {
            vscode.window.showErrorMessage('Error loading decorations: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    }
}
exports.CustomSidebarView = CustomSidebarView;
CustomSidebarView.viewType = "pawpals.openview";
CustomSidebarView.loginViewType = "pawpals.login";
//# sourceMappingURL=CustomSidebarView.js.map