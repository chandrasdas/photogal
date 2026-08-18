import fs from 'node:fs';
import path from 'node:path';
import { fail, redirect } from '@sveltejs/kit';
import sharp from 'sharp';
import { db } from '$lib/server/db';
import { albumsTable, photosTable } from '$lib/server/schema';
import { desc, eq } from 'drizzle-orm';
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

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.isAdmin) {
		redirect(303, '/admin/login?redirectTo=/photo-gallery/admin/upload');
	}

	const allAlbums = await db.select().from(albumsTable).orderBy(desc(albumsTable.createdAt));

	return {
		albums: allAlbums
	};
};

export const actions = {
	default: async ({ request, locals }) => {
		if (!locals.isAdmin) {
			return fail(403, { error: 'Unauthorized. Admin privileges required.' });
		}

		const formData = await request.formData();
		const mode = formData.get('mode'); // 'new' | 'existing'
		const existingAlbumId = formData.get('existingAlbumId');
		const title = formData.get('title');
		const tag = formData.get('tag');
		const eventDateStr = formData.get('eventDate');
		const photos = formData.getAll('photos');

		const validPhotos = photos.filter((p): p is File => p instanceof File && p.size > 0);

		if (validPhotos.length === 0) {
			return fail(400, { error: 'Please select at least one photo.' });
		}

		try {
			let targetAlbumId: number;
			let targetAlbumTitle: string;

			if (mode === 'existing') {
				const parsedId = Number.parseInt(String(existingAlbumId), 10);
				if (Number.isNaN(parsedId)) {
					return fail(400, { error: 'Please select a valid existing album.' });
				}

				const [existingAlbum] = await db
					.select()
					.from(albumsTable)
					.where(eq(albumsTable.id, parsedId));

				if (!existingAlbum) {
					return fail(404, { error: 'Selected album not found.' });
				}

				targetAlbumId = existingAlbum.id;
				targetAlbumTitle = existingAlbum.title;
			} else {
				const albumTitle = typeof title === 'string' && title.trim() ? title.trim() : '';
				const albumTag = typeof tag === 'string' && tag.trim() ? tag.trim() : 'General';

				if (!albumTitle) {
					return fail(400, { error: 'Album name is required.' });
				}

				let parsedEventDate: Date | null = null;
				if (typeof eventDateStr === 'string' && eventDateStr.trim()) {
					const parsed = new Date(eventDateStr.trim());
					if (!Number.isNaN(parsed.getTime())) {
						parsedEventDate = parsed;
					}
				}
				if (!parsedEventDate) {
					parsedEventDate = new Date();
				}

				const [insertedAlbum] = await db
					.insert(albumsTable)
					.values({
						title: albumTitle,
						tag: albumTag,
						eventDate: parsedEventDate
					})
					.returning();

				targetAlbumId = insertedAlbum.id;
				targetAlbumTitle = insertedAlbum.title;
			}

			// Dedicated album folder inside uploads/
			const folderName = getAlbumFolderName(targetAlbumTitle);
			const albumDir = path.resolve('uploads', folderName);
			if (!fs.existsSync(albumDir)) {
				fs.mkdirSync(albumDir, { recursive: true });
			}

			// Find current number of photos in album to sequence filenames nicely
			const existingPhotos = await db
				.select({ id: photosTable.id })
				.from(photosTable)
				.where(eq(photosTable.albumId, targetAlbumId));

			const startingIndex = existingPhotos.length;

			// Process all photos concurrently with Sharp
			const processedPhotoUrls: string[] = [];

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
					processedPhotoUrls.push(url);

					// Insert photo record
					await db.insert(photosTable).values({
						albumId: targetAlbumId,
						url,
						width: info.width,
						height: info.height
					});
				})
			);

			return {
				success: true,
				mode: mode === 'existing' ? 'existing' : 'new',
				albumId: targetAlbumId,
				albumTitle: targetAlbumTitle,
				photoCount: validPhotos.length,
				previewUrl: processedPhotoUrls[0] || null
			};
		} catch (err) {
			console.error('Failed to upload photos to album:', err);
			return fail(500, { error: 'Failed to process photos and save to album.' });
		}
	}
} satisfies Actions;
