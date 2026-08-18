import fs from 'node:fs';
import path from 'node:path';
import { error, fail, redirect } from '@sveltejs/kit';
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
	addPhotos: async ({ request, params, locals }) => {
		if (!locals.isAdmin) {
			return fail(403, { error: 'Unauthorized. Admin privileges required.' });
		}

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
				action: 'addPhotos',
				addedCount: validPhotos.length
			};
		} catch (err) {
			console.error('Failed to add photos to album:', err);
			return fail(500, { error: 'Failed to process and upload photos.' });
		}
	},

	deletePhoto: async ({ request, params, locals }) => {
		if (!locals.isAdmin) {
			return fail(403, { error: 'Unauthorized. Admin privileges required.' });
		}

		const albumId = Number.parseInt(params.albumId, 10);
		if (Number.isNaN(albumId)) {
			return fail(400, { error: 'Invalid Album ID' });
		}

		const formData = await request.formData();
		const photoId = Number.parseInt(String(formData.get('photoId')), 10);

		if (Number.isNaN(photoId)) {
			return fail(400, { error: 'Invalid Photo ID.' });
		}

		const [photo] = await db.select().from(photosTable).where(eq(photosTable.id, photoId));

		if (!photo || photo.albumId !== albumId) {
			return fail(404, { error: 'Photo not found in this album.' });
		}

		try {
			// Delete photo file from uploads/
			if (photo.url.startsWith('/uploads/')) {
				const relPath = photo.url.replace(/^\/uploads\//, '');
				const filePath = path.resolve('uploads', relPath);
				if (fs.existsSync(filePath)) {
					try {
						fs.unlinkSync(filePath);
					} catch (e) {
						console.error('Failed to unlink photo file:', filePath, e);
					}
				}
			}

			// Delete DB record
			await db.delete(photosTable).where(eq(photosTable.id, photoId));

			return {
				success: true,
				action: 'deletePhoto',
				deletedPhotoId: photoId
			};
		} catch (err) {
			console.error('Failed to delete photo:', err);
			return fail(500, { error: 'Failed to delete photo.' });
		}
	},

	deleteAlbum: async ({ params, locals }) => {
		if (!locals.isAdmin) {
			return fail(403, { error: 'Unauthorized. Admin privileges required.' });
		}

		const albumId = Number.parseInt(params.albumId, 10);
		if (Number.isNaN(albumId)) {
			return fail(400, { error: 'Invalid Album ID' });
		}

		const [album] = await db.select().from(albumsTable).where(eq(albumsTable.id, albumId));
		if (!album) {
			return fail(404, { error: 'Album not found.' });
		}

		try {
			// 1. Delete all photo files from disk
			const photos = await db.select().from(photosTable).where(eq(photosTable.albumId, albumId));

			for (const photo of photos) {
				if (photo.url.startsWith('/uploads/')) {
					const relPath = photo.url.replace(/^\/uploads\//, '');
					const filePath = path.resolve('uploads', relPath);
					if (fs.existsSync(filePath)) {
						try {
							fs.unlinkSync(filePath);
						} catch (e) {
							console.error('Failed to unlink photo file:', filePath, e);
						}
					}
				}
			}

			// 2. Remove album folder if it exists
			const folderName = getAlbumFolderName(album.title);
			const albumDir = path.resolve('uploads', folderName);
			if (fs.existsSync(albumDir)) {
				try {
					fs.rmSync(albumDir, { recursive: true, force: true });
				} catch (e) {
					console.error('Failed to delete album directory:', albumDir, e);
				}
			}

			// 3. Delete from DB
			await db.delete(photosTable).where(eq(photosTable.albumId, albumId));
			await db.delete(albumsTable).where(eq(albumsTable.id, albumId));
		} catch (err) {
			console.error('Failed to delete album:', err);
			return fail(500, { error: 'Failed to delete album.' });
		}

		redirect(303, '/photo-gallery');
	}
} satisfies Actions;
