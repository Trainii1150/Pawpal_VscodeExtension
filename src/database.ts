import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    port: Number(process.env.DB_PORT) || 5432,
});

async function queryDatabase(query: string, params: any[] = []) {
    const client = await pool.connect();
    try {
        const res = await client.query(query, params);
        return res.rows;
    } catch (err) {
        console.error('Database query error:', err);
        throw err;
    } finally {
        client.release();
    }
}

export async function updateDatabase(uid: string, token: string, isLoggedIn: boolean) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        if (isLoggedIn) {
            await client.query('UPDATE extension_used SET current_login = false WHERE uid = $1', [uid]);
            await client.query(
                'INSERT INTO extension_used (uid, extensions_token, current_login) VALUES ($1, $2, true) ON CONFLICT (uid) DO UPDATE SET extensions_token = $2, current_login = true',
                [uid, token]
            );
        } else {
            await client.query('UPDATE extension_used SET current_login = false WHERE uid = $1', [uid]);
        }
        
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export async function getUsernameByUid(uid: string): Promise<string | null> {
    const rows = await queryDatabase('SELECT username FROM user_table WHERE user_id = $1', [uid]);
    return rows.length > 0 ? rows[0].username : null;
}

export async function validateTokenInDatabase(uid: string, token: string): Promise<boolean> {
    const rows = await queryDatabase('SELECT current_login FROM extension_used WHERE uid = $1 AND extensions_token = $2', [uid, token]);
    return rows.length > 0 && rows[0].current_login;
}

export async function getUserDecorations(uid: string): Promise<any> {
    const rows = await queryDatabase(`
        SELECT background_path, pet_path, long_programming_effect_path, error_effect_path
        FROM user_decorations
        WHERE user_id = $1
    `, [uid]);
    return rows.length > 0 ? rows[0] : null;
}

export default pool;