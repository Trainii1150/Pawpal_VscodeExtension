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
exports.getUserDecorations = exports.validateTokenInDatabase = exports.getUsernameByUid = exports.updateDatabase = void 0;
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const pool = new pg_1.Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    port: Number(process.env.DB_PORT) || 5432,
});
async function queryDatabase(query, params = []) {
    const client = await pool.connect();
    try {
        const res = await client.query(query, params);
        return res.rows;
    }
    catch (err) {
        console.error('Database query error:', err);
        throw err;
    }
    finally {
        client.release();
    }
}
async function updateDatabase(uid, token, isLoggedIn) {
    const client = await pool.connect();
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
exports.updateDatabase = updateDatabase;
async function getUsernameByUid(uid) {
    const rows = await queryDatabase('SELECT username FROM user_table WHERE user_id = $1', [uid]);
    return rows.length > 0 ? rows[0].username : null;
}
exports.getUsernameByUid = getUsernameByUid;
async function validateTokenInDatabase(uid, token) {
    const rows = await queryDatabase('SELECT current_login FROM extension_used WHERE uid = $1 AND extensions_token = $2', [uid, token]);
    return rows.length > 0 && rows[0].current_login;
}
exports.validateTokenInDatabase = validateTokenInDatabase;
async function getUserDecorations(uid) {
    const rows = await queryDatabase(`
        SELECT background_path, pet_path, long_programming_effect_path, error_effect_path
        FROM user_decorations
        WHERE user_id = $1
    `, [uid]);
    return rows.length > 0 ? rows[0] : null;
}
exports.getUserDecorations = getUserDecorations;
exports.default = pool;
//# sourceMappingURL=database.js.map