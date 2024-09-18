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
exports.removeTokenFile = exports.writeTokenToFile = exports.readTokenFromFile = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const accTokenPath = path.join(__dirname, 'acctoken.json');
function readTokenFromFile() {
    if (fs.existsSync(accTokenPath)) {
        try {
            const data = fs.readFileSync(accTokenPath, 'utf-8');
            return JSON.parse(data);
        }
        catch (err) {
            console.error('Error reading token from file:', err);
            return null;
        }
    }
    return null;
}
exports.readTokenFromFile = readTokenFromFile;
function writeTokenToFile(uid, token) {
    const accToken = { uid, token };
    fs.writeFileSync(accTokenPath, JSON.stringify(accToken), 'utf-8');
    console.log('Token saved to file');
}
exports.writeTokenToFile = writeTokenToFile;
function removeTokenFile() {
    if (fs.existsSync(accTokenPath)) {
        fs.unlinkSync(accTokenPath);
        console.log('Token file removed');
    }
}
exports.removeTokenFile = removeTokenFile;
//# sourceMappingURL=tokenUtils.js.map