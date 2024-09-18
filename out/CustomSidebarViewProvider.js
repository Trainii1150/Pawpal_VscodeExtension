"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomSidebarView = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'postgres',
    password: process.env.DB_PASSWORD || '14785PawPal',
    port: 5432,
});
const accTokenPath = path.join(__dirname, 'acctoken.json');
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
        const storedData = readTokenFromFile();
        if (storedData) {
            this._viewType = CustomSidebarView.viewType;
            this.updateWebviewContent(webviewView.webview, CustomSidebarView.viewType);
            this.displayWelcomeMessage(storedData.uid);
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
    }
    updateWebviewContent(webview, viewType) {
        const fileName = viewType === CustomSidebarView.loginViewType ? "login.html" : "webview.html";
        const htmlFilePath = path.join(this._extensionUri.fsPath, 'resources', fileName);
        let htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');
        const stylesheetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "assets", "main.css"));
        htmlContent = htmlContent.replace('main.css', stylesheetUri.toString());
        webview.html = htmlContent;
        webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'loginSuccess':
                    this.handleLoginSuccess(message.token, message.uid);
                    break;
                case 'loginFailure':
                    vscode.window.showErrorMessage('Login failed: ' + message.error);
                    break;
                case 'logout':
                    this.handleLogout();
                    break;
            }
        });
    }
    async handleLoginSuccess(token, uid) {
        try {
            // Save token and uid to file
            fs.writeFileSync(accTokenPath, JSON.stringify({ uid, token }), 'utf-8');
            console.log('Token and uid saved to file');
            // Update database
            await this.updateDatabase(uid, token, true);
            vscode.window.showInformationMessage('Login successful');
            // Update the webview to show the main content
            this._viewType = CustomSidebarView.viewType;
            if (this._view) {
                this.updateWebviewContent(this._view.webview, CustomSidebarView.viewType);
            }
            this.displayWelcomeMessage(uid);
        }
        catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage('Error during login handling: ' + error.message);
            }
            else {
                vscode.window.showErrorMessage('An unknown error occurred during login handling.');
            }
        }
    }
    async handleLogout() {
        try {
            const storedData = JSON.parse(fs.readFileSync(accTokenPath, 'utf-8'));
            const uid = storedData.uid;
            // Remove token and uid from file
            fs.unlinkSync(accTokenPath);
            console.log('Token and uid removed from file');
            // Update database
            await this.updateDatabase(uid, '', false);
            vscode.window.showInformationMessage('Logout successful');
            // Update the webview to show the login content
            this._viewType = CustomSidebarView.loginViewType;
            if (this._view) {
                this.updateWebviewContent(this._view.webview, CustomSidebarView.loginViewType);
            }
            this._view?.webview.postMessage({ command: 'clearWelcome' });
        }
        catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage('Error during logout handling: ' + error.message);
            }
            else {
                vscode.window.showErrorMessage('An unknown error occurred during logout handling.');
            }
        }
    }
    async updateDatabase(uid, token, isLoggedIn) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            if (isLoggedIn) {
                // Set current_login to false for all records with the same user_id
                await client.query('UPDATE "extension_used" SET current_login = false WHERE uid = $1', [uid]);
                // Upsert the token and set current_login to true
                await client.query('INSERT INTO "extension_used" (uid, extensions_token, current_login) VALUES ($1, $2, true) ON CONFLICT (uid) DO UPDATE SET extensions_token = $2, current_login = true', [uid, token]);
            }
            else {
                // Set current_login to false for the record with the same user_id
                await client.query('UPDATE "extension_used" SET current_login = false WHERE uid = $1', [uid]);
            }
            await client.query('COMMIT');
        }
        catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }
        finally {
            client.release();
        }
    }
    async getUsernameByUid(uid) {
        const client = await pool.connect();
        try {
            const res = await client.query('SELECT username FROM user_table WHERE user_id = $1', [uid]);
            if (res.rows.length > 0) {
                return res.rows[0].username;
            }
            return null;
        }
        finally {
            client.release();
        }
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
        const username = await this.getUsernameByUid(uid);
        if (username) {
            this._view?.webview.postMessage({ command: 'displayWelcome', username });
        }
    }
}
exports.CustomSidebarView = CustomSidebarView;
CustomSidebarView.viewType = "pawpals.openview";
CustomSidebarView.loginViewType = "pawpals.login";
function readTokenFromFile() {
    if (fs.existsSync(accTokenPath)) {
        try {
            const data = fs.readFileSync(accTokenPath, 'utf-8');
            const parsedData = JSON.parse(data);
            return parsedData;
        }
        catch (err) {
            console.error('Error reading token from file:', err);
            return null;
        }
    }
    return null;
}
//# sourceMappingURL=CustomSidebarViewProvider.js.map