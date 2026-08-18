import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const dataDir = path.resolve('data');
if (!fs.existsSync(dataDir)) {
	fs.mkdirSync(dataDir, { recursive: true });
}

const client = createClient({
	url: 'file:data/sqlite.db'
});

// Auto-initialize tables if they don't exist
await client.execute(`
	CREATE TABLE IF NOT EXISTS albums (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		tag TEXT NOT NULL DEFAULT 'General',
		created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
	);
`);

await client.execute(`
	CREATE TABLE IF NOT EXISTS photos (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
		url TEXT NOT NULL,
		width INTEGER,
		height INTEGER,
		created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
	);
`);

// Ensure width & height columns exist if upgraded from earlier schema
try {
	await client.execute(`ALTER TABLE photos ADD COLUMN width INTEGER;`);
} catch {
	// Column already exists
}

try {
	await client.execute(`ALTER TABLE photos ADD COLUMN height INTEGER;`);
} catch {
	// Column already exists
}

export const db = drizzle(client, { schema });
