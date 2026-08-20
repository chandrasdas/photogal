// app.js - cPanel Passenger Startup Entrypoint
import fs from 'node:fs';
import path from 'node:path';

// Automatically load .env if present in root
try {
	const envPath = path.resolve(process.cwd(), '.env');
	if (fs.existsSync(envPath)) {
		const content = fs.readFileSync(envPath, 'utf8');
		for (const line of content.split('\n')) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;
			const idx = trimmed.indexOf('=');
			if (idx !== -1) {
				const key = trimmed.slice(0, idx).trim();
				let val = trimmed.slice(idx + 1).trim();
				if (
					(val.startsWith('"') && val.endsWith('"')) ||
					(val.startsWith("'") && val.endsWith("'"))
				) {
					val = val.slice(1, -1);
				}
				if (process.env[key] === undefined) {
					process.env[key] = val;
				}
			}
		}
	}
} catch (e) {
	console.warn('Notice: Could not load .env file:', e);
}

// Allow larger uploads for photo gallery (default adapter-node is 512K)
if (!process.env.BODY_SIZE_LIMIT) {
	process.env.BODY_SIZE_LIMIT = '100M';
}

async function startServer() {
	try {
		await import('./build/index.js');
	} catch (error) {
		console.error('Error booting SvelteKit server:', error);
		process.exit(1);
	}
}

startServer();
