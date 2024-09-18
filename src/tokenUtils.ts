import * as path from 'path';
import * as fs from 'fs';

const accTokenPath = path.join(__dirname, 'acctoken.json');

export function readTokenFromFile(): { uid: string, token: string } | null {
    if (fs.existsSync(accTokenPath)) {
        try {
            const data = fs.readFileSync(accTokenPath, 'utf-8');
            return JSON.parse(data);
        } catch (err) {
            console.error('Error reading token from file:', err);
            return null;
        }
    }
    return null;
}

export function writeTokenToFile(uid: string, token: string): void {
    const accToken = { uid, token };
    fs.writeFileSync(accTokenPath, JSON.stringify(accToken), 'utf-8');
    console.log('Token saved to file');
}

export function removeTokenFile(): void {
    if (fs.existsSync(accTokenPath)) {
        fs.unlinkSync(accTokenPath);
        console.log('Token file removed');
    }
}
