import fs from 'node:fs';
import path from 'node:path';
import { error, fail } from '@sveltejs/kit';
import sharp from 'sharp';
import { db } from '$lib/server/db';
import { albumsTable, photosTable } from '$lib/server/schema';
import { eq, asc } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

function getAlbumFolderName(albumTitle: string): string {
	const sanitized = albumTitle
		.trim()
		.toLowerCase()
		.replace(/[^a-zA-Z0-9_-]/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
	return sanitized || 'album';
}

export const load: PageServerLoad = async ({ params }) => {
	const albumId = Number.parseInt(params.albumId, 10);
	if (Number.isNaN(albumId)) {
		error(404, 'Invalid Album ID');
	}

	const [album] = await db.select().from(albumsTable).where(eq(albumsTable.id, albumId));

	if (!album) {
		error(404, 'Album not found');
	}

	const photos = await db
		.select()
		.from(photosTable)
		.where(eq(photosTable.albumId, albumId))
		.orderBy(asc(photosTable.id));

	return {
		album,
		photos
	};
};

export const actions = {
	addPhotos: async ({ request, params }) => {
		const albumId = Number.parseInt(params.albumId, 10);
		if (Number.isNaN(albumId)) {
			return fail(400, { error: 'Invalid Album ID' });
		}

		const [album] = await db.select().from(albumsTable).where(eq(albumsTable.id, albumId));

		if (!album) {
			return fail(404, { error: 'Album not found' });
		}

		const formData = await request.formData();
		const photos = formData.getAll('photos');

		const validPhotos = photos.filter((p): p is File => p instanceof File && p.size > 0);

		if (validPhotos.length === 0) {
			return fail(400, { error: 'Please select at least one photo to add.' });
		}

		// Dedicated album folder inside uploads/
		const folderName = getAlbumFolderName(album.title);
		const albumDir = path.resolve('uploads', folderName);
		if (!fs.existsSync(albumDir)) {
			fs.mkdirSync(albumDir, { recursive: true });
		}

		// Find current number of photos in album to continue sequencing
		const existingPhotos = await db
			.select({ id: photosTable.id })
			.from(photosTable)
			.where(eq(photosTable.albumId, albumId));

		const startingIndex = existingPhotos.length;

		try {
			await Promise.all(
				validPhotos.map(async (photo, index) => {
					let photoNumber = startingIndex + index + 1;
					let fileName = `${folderName}-${photoNumber}.webp`;
					let filePath = path.join(albumDir, fileName);

					while (fs.existsSync(filePath)) {
						photoNumber++;
						fileName = `${folderName}-${photoNumber}.webp`;
						filePath = path.join(albumDir, fileName);
					}

					const buffer = Buffer.from(await photo.arrayBuffer());

					const info = await sharp(buffer)
						.resize({
							width: 1920,
							withoutEnlargement: true
						})
						.webp({ quality: 80 })
						.toFile(filePath);

					const url = `/uploads/${folderName}/${fileName}`;

					await db.insert(photosTable).values({
						albumId,
						url,
						width: info.width,
						height: info.height
					});
				})
			);

			return {
				success: true,
				addedCount: validPhotos.length
			};
		} catch (err) {
			console.error('Failed to add photos to album:', err);
			return fail(500, { error: 'Failed to process and upload photos.' });
		}
	}
} satisfies Actions;
