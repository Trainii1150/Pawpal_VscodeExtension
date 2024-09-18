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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const CustomSidebarView_1 = require("./CustomSidebarView");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const uuid_1 = require("uuid");
const dotenv = __importStar(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
const database_1 = __importDefault(require("./database")); // นำเข้า pool ที่ export จาก database.ts
dotenv.config();
const accTokenPath = path.join(__dirname, 'acctoken.json');
// ประกาศตัวแปรในระดับไฟล์
let currentUserUid = '';
let currentToken = '';
let currentUsername = '';
let statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
let initialWordCount = 0;
let isAfk = false;
let lastActiveTime = 0;
let afkTimeLimit = 300000; // 5 minutes in milliseconds
let totalActiveTime = 0;
let afkTimeoutId = null;
let currentLanguage = 'JavaScript'; // กำหนดค่าเริ่มต้นให้กับ currentLanguage
let pasteCount = 0;
class WordCounter {
    static countWords(text) {
        return text.split(/\s+/).filter(word => word !== '').length;
    }
    static countLines(text) {
        return text.split('\n').length;
    }
}
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
function writeTokenToFile(uid, token) {
    const accToken = { uid, token };
    fs.writeFileSync(accTokenPath, JSON.stringify(accToken), 'utf-8');
    console.log('Token saved to file');
}
function removeTokenFile() {
    if (fs.existsSync(accTokenPath)) {
        fs.unlinkSync(accTokenPath);
        console.log('Token file removed');
    }
}
async function updateDatabase(uid, token, isLoggedIn) {
    const client = await database_1.default.connect(); // ใช้ pool ที่นำเข้ามาจาก database.ts
    try {
        await client.query('BEGIN');
        if (isLoggedIn) {
            await client.query('UPDATE extension_used SET current_login = false WHERE uid = $1', [uid]);
            await client.query('INSERT INTO extension_used (uid, extensions_token, current_login) VALUES ($1, $2, true) ON CONFLICT (uid) DO UPDATE SET extensions_token = $2, current_login = true', [uid, token]);
        }
        else {
            await client.query('UPDATE extension_used SET current_login = false WHERE uid = $1', [uid]);
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
async function getUsernameByUid(uid) {
    const client = await database_1.default.connect(); // ใช้ pool ที่นำเข้ามาจาก database.ts
    try {
        const res = await client.query('SELECT username FROM user_table WHERE user_id = $1', [uid]);
        return res.rows.length > 0 ? res.rows[0].username : null;
    }
    finally {
        client.release();
    }
}
async function validateTokenInDatabase(uid, token) {
    const client = await database_1.default.connect(); // ใช้ pool ที่นำเข้ามาจาก database.ts
    try {
        const res = await client.query('SELECT current_login FROM extension_used WHERE uid = $1 AND extensions_token = $2', [uid, token]);
        return res.rows.length > 0 && res.rows[0].current_login;
    }
    catch (err) {
        console.error('Error validating token:', err);
        return false;
    }
    finally {
        client.release();
    }
}
// ฟังก์ชันการค้นหาใน Google และบันทึกข้อมูลในฐานข้อมูล
async function searchGoogleAndSaveResults(content, projectName) {
    const apiKey = process.env.GOOGLE_API_KEY;
    const searchEngineId = process.env.SEARCH_ENGINE_ID;
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(content)}`;
    try {
        const response = await axios_1.default.get(url);
        const searchResults = response.data.items || [];
        let links = '';
        if (searchResults.length > 0) {
            searchResults.forEach((item) => {
                links += `${item.title} - ${item.link}\n`;
            });
            // เพิ่มลิงก์ไปยังฐานข้อมูลในตาราง coding_activity
            const activityCodeID = (0, uuid_1.v4)();
            await saveCodeReferencesToDatabase(activityCodeID, projectName, links, pasteCount);
            vscode.window.showInformationMessage('Search results saved to database');
        }
        else {
            vscode.window.showInformationMessage('No similar code found.');
        }
    }
    catch (error) {
        vscode.window.showErrorMessage('Error fetching search results');
        console.error(error);
    }
}
async function saveCodeReferencesToDatabase(activityCodeID, projectName, links, pasteCount) {
    const client = await database_1.default.connect(); // ใช้ pool ที่นำเข้ามาจาก database.ts
    try {
        const sqlQuery = `
      INSERT INTO coding_activity ("ActivityCode_ID", "Languages", "code_references", "paste_count", "Timestamp", "user_id", "project_name")
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6)
      ON CONFLICT ("ActivityCode_ID") DO UPDATE SET code_references = $3, paste_count = $4, project_name = $6;
    `;
        await client.query(sqlQuery, [activityCodeID, projectName, links, pasteCount, currentUserUid, projectName]);
    }
    catch (err) {
        console.error('Error saving code references to database:', err);
    }
    finally {
        client.release();
    }
}
function saveToDatabase(data) {
    const storedData = readTokenFromFile();
    if (storedData) {
        data.uid = storedData.uid;
    }
    else {
        vscode.window.showErrorMessage('User is not logged in. Please log in first.');
        return;
    }
    database_1.default.connect((err, client, done) => {
        if (err) {
            return console.error('Error acquiring client', err.stack);
        }
        if (!client) {
            return console.error('Client is undefined');
        }
        const sqlQuery = `INSERT INTO "coding_activity" ("ActivityCode_ID", "Languages", "wordcount", "coins", "time", "Timestamp", "user_id", "code_references", "paste_count", "project_name")
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, '', 0, $7)`;
        const values = [
            data.activityCodeID,
            data.languages,
            data.wordcount,
            data.coins,
            data.time,
            data.uid,
            data.projectName
        ];
        client.query(sqlQuery, values, (err, result) => {
            done();
            if (err) {
                return console.error('Error executing query:', err.stack);
            }
            console.log('Data inserted successfully');
        });
    });
}
function testDatabaseConnection() {
    database_1.default.connect((err, client, done) => {
        if (err) {
            console.error('Error connecting to database:', err.stack);
            return;
        }
        if (!client) {
            console.error('Client is undefined');
            return;
        }
        console.log('Successfully connected to database!');
        client.query('SELECT NOW()', (err, result) => {
            done();
            if (err) {
                console.error('Error executing query:', err.stack);
            }
            else {
                console.log('Current timestamp from database:', result.rows[0].now);
            }
        });
    });
}
class WordCounterStatus {
    constructor() {
        this.updateStatus(); // Update status on creation
        // Listen for text document changes
        vscode.workspace.onDidChangeTextDocument(this.updateStatus);
    }
    updateStatus() {
        const editor = vscode.window.activeTextEditor; // When changing tab filename
        if (editor) {
            const document = editor.document;
            const text = document.getText();
            const wordCount = WordCounter.countWords(text);
            const lineCount = WordCounter.countLines(text);
            let curWordCount = wordCount - initialWordCount;
            let tmpWordCount = wordCount;
            let lang = document.languageId;
            if (curWordCount < 0) {
                console.log("Old: " + curWordCount);
                curWordCount = tmpWordCount + Math.abs(tmpWordCount);
                console.log("New: " + curWordCount);
                curWordCount = tmpWordCount;
            }
            const line = editor.selection.active.line;
            statusBar.text = `$(terminal-powershell) Ln ${line}, Words ${wordCount}, CodeLines ${lineCount}, Wordcurrently ${curWordCount}, Language ${lang}`;
            statusBar.show(); // Show the status bar
        }
        else {
            statusBar.text = 'Word Count: 0';
        }
    }
}
class ActivityHandler {
    static initialize() {
        console.log('init');
        statusBar.text = `$(sync~spin) Standby to Coding`;
        statusBar.command = 'startcoding.activate';
        initialWordCount = WordCounter.countWords(String(vscode.window.activeTextEditor?.document.getText()));
        statusBar.show();
        if (this.changeTextListener) {
            this.changeTextListener.dispose();
        }
        this.changeTextListener = vscode.workspace.onDidChangeTextDocument((event) => {
            const changes = event.contentChanges[0];
            const text = changes.text;
            if (text.length > 0) {
                TimerManager.resetAfkTimeout(); // รีเซ็ตเวลา AFK ทุกครั้งที่มีการพิมพ์
                if (!isAfk) {
                    TimerManager.startTimer(true); // เริ่มจับเวลาเมื่อมีการเปลี่ยนแปลงเอกสาร
                }
            }
            if (WordCounter.countWords(text) >= 100) { // ตรวจสอบถ้าข้อความเพิ่มขึ้นมากกว่า 100 คำ
                pasteCount++;
                vscode.commands.executeCommand('startcoding.activate');
            }
        });
    }
    static start() {
        console.log('start');
        const wordCounterStatus = new WordCounterStatus();
        statusBar.command = 'stopcoding.activate';
        TimerManager.resetAfkTimeout();
        TimerManager.startTimer(true);
    }
    static stop() {
        console.log('stop');
        if (isAfk) {
            lastActiveTime -= afkTimeLimit;
            isAfk = false;
        }
        initialWordCount = WordCounter.countWords(String(vscode.window.activeTextEditor?.document.getText()));
        if (afkTimeoutId) {
            clearTimeout(afkTimeoutId);
        }
        TimerManager.startTimer(false);
        vscode.window.showInformationMessage('You are AFK in ' + lastActiveTime);
        if (lastActiveTime > 0) {
            const coins = (initialWordCount * lastActiveTime) / 100;
            const dataToAppend = {
                activityCodeID: (0, uuid_1.v4)(),
                languages: currentLanguage,
                wordcount: initialWordCount,
                coins: coins,
                time: `${lastActiveTime}`,
                uid: currentUserUid,
                projectName: vscode.workspace.name || 'Unnamed Project'
            };
            console.log('saveToDatabase');
            saveToDatabase(dataToAppend);
        }
        this.initialize();
    }
}
ActivityHandler.changeTextListener = null;
class TimerManager {
    static resetAfkTimeout() {
        if (afkTimeoutId) {
            clearTimeout(afkTimeoutId);
        }
        let afkSeconds = 0;
        let afkIntervalId;
        afkIntervalId = setInterval(() => {
            afkSeconds++;
        }, 1000);
        afkTimeoutId = setTimeout(() => {
            vscode.window.showInformationMessage('You are AFK');
            clearInterval(afkIntervalId);
            isAfk = true;
            ActivityHandler.stop(); // หยุดจับเวลาและบันทึกข้อมูล
        }, afkTimeLimit);
    }
    static startTimer(isStart) {
        let intervalId;
        if (isStart) {
            totalActiveTime = 0;
            intervalId = setInterval(() => {
                ++totalActiveTime;
            }, 1000);
        }
        else {
            lastActiveTime = totalActiveTime;
            setTimeout(() => {
                clearInterval(intervalId);
                intervalId = undefined;
                totalActiveTime = 0;
            }, 0);
        }
    }
}
function activate(context) {
    testDatabaseConnection();
    const customSidebarProvider = new CustomSidebarView_1.CustomSidebarView(context.extensionUri, CustomSidebarView_1.CustomSidebarView.viewType);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(CustomSidebarView_1.CustomSidebarView.viewType, customSidebarProvider));
    const customLoginProvider = new CustomSidebarView_1.CustomSidebarView(context.extensionUri, CustomSidebarView_1.CustomSidebarView.loginViewType);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(CustomSidebarView_1.CustomSidebarView.loginViewType, customLoginProvider));
    const storedData = readTokenFromFile();
    if (storedData) {
        currentToken = storedData.token;
        currentUserUid = storedData.uid;
        validateTokenInDatabase(currentUserUid, currentToken).then(isValid => {
            if (isValid) {
                getUsernameByUid(currentUserUid).then(username => {
                    if (username) {
                        currentUsername = username;
                        vscode.window.showInformationMessage(`Hello, ${currentUsername}`);
                        customLoginProvider._view?.webview.postMessage({ command: 'displayWelcome', username: currentUsername });
                    }
                }).catch(error => console.error('Failed to get username:', error));
                console.log('Token and uid loaded from file:', currentToken, currentUserUid);
            }
            else {
                vscode.window.showInformationMessage('Please enter your Extensions token.');
            }
        }).catch(error => console.error('Failed to validate token in database:', error));
    }
    else {
        vscode.window.showInformationMessage('Please enter your Extensions token.');
    }
    ActivityHandler.initialize();
    // เพิ่มฟังก์ชันดักจับการวาง (Paste) โค้ด
    const onDidChangeTextDocumentDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.contentChanges.length > 0) {
            const changes = event.contentChanges[0];
            const text = changes.text;
            const projectName = vscode.workspace.name || 'Unnamed Project';
            // เช็คว่ามีการวาง (Paste) โค้ดหรือไม่
            if (text.length > 0 && (changes.text.includes('\n') || changes.text.includes(' '))) {
                searchGoogleAndSaveResults(text, projectName).catch(error => console.error('Failed to search Google and save results:', error));
            }
        }
    });
    const searchAndSave = vscode.commands.registerCommand('extension.searchAndSave', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const content = document.getText();
            const projectName = vscode.workspace.name || 'Unnamed Project';
            searchGoogleAndSaveResults(content, projectName).catch(error => console.error('Failed to search Google and save results:', error));
        }
    });
    const start = vscode.commands.registerCommand('startcoding.activate', () => {
        ActivityHandler.start();
    });
    const stop = vscode.commands.registerCommand('stopcoding.activate', () => {
        ActivityHandler.stop();
    });
    const logout = vscode.commands.registerCommand('pawpals.logout', () => {
        vscode.window.showInformationMessage('Logging out...');
        const customSidebarProvider = new CustomSidebarView_1.CustomSidebarView(context.extensionUri, CustomSidebarView_1.CustomSidebarView.loginViewType);
        context.subscriptions.push(vscode.window.registerWebviewViewProvider(CustomSidebarView_1.CustomSidebarView.loginViewType, customSidebarProvider));
        customSidebarProvider.handleLogout();
        currentToken = '';
        currentUserUid = '';
        currentUsername = '';
    });
    context.subscriptions.push(onDidChangeTextDocumentDisposable, searchAndSave, start, stop, statusBar, logout);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map