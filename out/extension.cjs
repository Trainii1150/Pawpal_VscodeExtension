"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = exports.WordCounterStatus = void 0;
const vscode = require("vscode");
const fs = require('fs');
const path = require('path');
const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
let allinwordcount = 0;
let lang;
let webviewPanel;
let afkTimeout = null;
const afkThreshold = 10000; // 5 minutes in milliseconds
let totalSeconds = 0;
let test = 0;
let flagafk = false;
//let tmpafkcount = 0;
class Counter {
    static countWords(text) {
        const words = text.replace(/[ \t\n\x0B\f\r]/g, '');
        return words ? words.length : 0;
    }
    static countLines(text) {
        return text.split('\n').length;
    }
}
class WordCounterController {
    constructor(wordCounter) {
        this._wordCounter = wordCounter;
        this._wordCounter.updateStatus();
        // subscribe to selection change and editor activation events
        let subscriptions = [];
        vscode.window.onDidChangeTextEditorSelection(this._onEvent, this, subscriptions);
        // vscode.window.onDidChangeActiveTextEditor(this._onEvent, this, subscriptions);
        // create a combined disposable from both event subscriptions
        this._disposable = vscode.Disposable.from(...subscriptions);
    }
    _onEvent() {
        this._wordCounter.updateStatus();
        Timer.afktimeout();
    }
    dispose() {
        this._disposable.dispose();
    }
}
class WordCounterStatus {
    updateStatus() {
        let editor = vscode.window.activeTextEditor; //when change tab filename
        if (editor) {
            const document = editor.document;
            const text = document.getText();
            const wordCount = Counter.countWords(text);
            const linecount = Counter.countLines(text);
            const line = editor.selection.active.line;
            let curwordcount = wordCount - Number(allinwordcount);
            let tmpwordcount = Number(wordCount);
            lang = document.languageId;
            //console.log(curwordcount, tmpwordcount);
            if (curwordcount < 0) {
                console.log("old :" + curwordcount);
                curwordcount = tmpwordcount + Math.abs(tmpwordcount);
                console.log("New :" + curwordcount);
                curwordcount = tmpwordcount;
            }
            statusBarItem.show();
            statusBarItem.text = `$(terminal-powershell) Ln ${line}, Words ${wordCount}, CodeLines ${linecount} , Wordcurrently ${curwordcount} , Language ${lang}`;
        }
        else {
            statusBarItem.text = 'Word Count: 0';
        }
    }
}
exports.WordCounterStatus = WordCounterStatus;
function appendToLogFile(data) {
    const customFolderPath = 'D:/GitHub/file.csv'; // Replace with your custom directory path
    if (data === '$(sync~spin) Standby to Coding') {
        return;
    }
    let trimmedString = data.replace("$(terminal-powershell)", "");
    const csvDataToAppend = trimmedString + ', Time used ' + test.toString() + '\r\n';
    fs.appendFile(customFolderPath + '/file.csv', csvDataToAppend, 'utf-8', (error) => {
        if (error) {
            throw error;
        }
        console.log('This data log was updated to file!');
    });
}
class Handler {
    static initailize() {
        statusBarItem.text = `$(sync~spin) Standby to Coding`;
        statusBarItem.command = 'startcoding.activate';
        allinwordcount = Counter.countWords(String(vscode.window.activeTextEditor?.document.getText()));
        statusBarItem.show();
    }
    static start() {
        let wordCounter = new WordCounterStatus();
        let controller = new WordCounterController(wordCounter);
        statusBarItem.command = 'stopcoding.activate';
        Timer.afktimeout();
        Timer.counttimer(true);
    }
    static stop() {
        if (flagafk) {
            test - afkThreshold;
            flagafk = false;
        }
        ;
        appendToLogFile(statusBarItem.text);
        allinwordcount = Counter.countWords(String(vscode.window.activeTextEditor?.document.getText()));
        statusBarItem.text = `$(sync~spin) Standby to Coding`;
        statusBarItem.command = 'startcoding.activate';
        if (afkTimeout) {
            clearTimeout(afkTimeout);
        }
        Timer.counttimer(false);
        vscode.window.showInformationMessage('You are AFK in ' + test);
        statusBarItem.show();
    }
}
class Timer {
    static afktimeout() {
        if (afkTimeout) {
            clearTimeout(afkTimeout);
        }
        let countafk = 0;
        let counttimerafk;
        counttimerafk = setInterval(() => {
            countafk++;
            console.log('afk seconds ' + countafk);
        }, 1000);
        afkTimeout = setTimeout(() => {
            vscode.window.showInformationMessage('You are AFK');
            clearInterval(counttimerafk);
            flagafk = true;
            Handler.stop();
        }, afkThreshold);
        console.log('reset time afk');
    }
    static counttimer(str) {
        let counttimer;
        if (str === true) {
            totalSeconds = 0;
            counttimer = setInterval(() => {
                ++totalSeconds;
                console.log('total seconds ' + totalSeconds);
            }, 1000);
        }
        else if (str === false) {
            console.log('close timer in' + totalSeconds);
            test = totalSeconds;
            setTimeout(() => {
                clearInterval(counttimer);
                counttimer = undefined;
                totalSeconds = 0;
            }, 0);
        }
    }
}
;
function activate(context) {
    Handler.initailize();
    vscode.workspace.onDidChangeTextDocument(() => {
        vscode.commands.executeCommand('startcoding.activate');
    });
    vscode.window.onDidChangeActiveTextEditor(() => {
        vscode.commands.executeCommand('stopcoding.activate');
    });
    const showWebViewCommand = vscode.commands.registerCommand('myExtension.showWebView', () => {
        if (!webviewPanel) {
            const webviewHtmlPath = path.join(context.extensionPath, 'resources', 'webView.html');
            const webviewHtmlContent = fs.readFileSync(webviewHtmlPath, 'utf-8');
            webviewPanel = vscode.window.createWebviewPanel('myWebview', 'My Webview', vscode.ViewColumn.One, {});
            webviewPanel.webview.html = webviewHtmlContent;
            webviewPanel.onDidDispose(() => {
                webviewPanel = undefined;
            });
        }
        else {
            webviewPanel.reveal();
        }
    });
    const start = vscode.commands.registerCommand('startcoding.activate', () => {
        Handler.start();
    });
    const stop = vscode.commands.registerCommand('stopcoding.activate', () => {
        Handler.stop();
    });
    context.subscriptions.push(start, stop, showWebViewCommand, statusBarItem);
    console.log(allinwordcount);
}
exports.activate = activate;
// This method is called when your extension is deactivated
function deactivate() {
    statusBarItem.dispose();
    appendToLogFile(statusBarItem.text);
    console.log(statusBarItem.text);
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.cjs.map