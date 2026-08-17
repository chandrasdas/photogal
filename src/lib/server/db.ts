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

export const db = drizzle(client, { schema });
