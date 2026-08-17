import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'drizzle-kit';

const dataDir = path.resolve('data');
if (!fs.existsSync(dataDir)) {
	fs.mkdirSync(dataDir, { recursive: true });
}

export default defineConfig({
	dialect: 'sqlite',
	schema: './src/lib/server/schema.ts',
	out: './drizzle',
	dbCredentials: {
		url: 'file:data/sqlite.db'
	}
});
