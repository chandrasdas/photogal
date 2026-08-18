import fs from 'node:fs/promises';
import path from 'node:path';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const baseDir = path.resolve('uploads');
		const targetPath = path.resolve(baseDir, params.filepath);

		// Security: Prevent directory traversal attacks
		if (!targetPath.startsWith(baseDir)) {
			error(403, 'Forbidden');
		}

		const file = await fs.readFile(targetPath);

		// Determine mime type from extension
		const ext = path.extname(targetPath).toLowerCase();
		let contentType = 'image/webp';
		if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
		else if (ext === '.png') contentType = 'image/png';
		else if (ext === '.gif') contentType = 'image/gif';
		else if (ext === '.svg') contentType = 'image/svg+xml';
		else if (ext === '.avif') contentType = 'image/avif';

		return new Response(file, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=31536000, immutable'
			}
		});
	} catch {
		error(404, 'Image not found');
	}
};
