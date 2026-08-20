import fs from 'node:fs';
import path from 'node:path';
import { fail } from '@sveltejs/kit';
import { base } from '$app/paths';
import { db } from '$lib/server/db';
import { albumsTable, photosTable } from '$lib/server/schema';
import { desc, eq, asc } from 'drizzle-orm';
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

function normalizePhotoUrl(rawUrl: string): string {
	if (!rawUrl) return '';
	if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
	if (base && rawUrl.startsWith(base)) return rawUrl;
	return `${base}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
}

export const load: PageServerLoad = async () => {
	const allAlbums = await db.select().from(albumsTable).orderBy(desc(albumsTable.createdAt));

	const albumsWithPhotos = await Promise.all(
		allAlbums.map(async (album) => {
			const photos = await db
				.select()
				.from(photosTable)
				.where(eq(photosTable.albumId, album.id))
				.orderBy(asc(photosTable.id));

			let sortedPhotos = photos;
			if (album.coverPhotoId) {
				const coverPhoto = photos.find((p) => p.id === album.coverPhotoId);
				if (coverPhoto) {
					sortedPhotos = [coverPhoto, ...photos.filter((p) => p.id !== album.coverPhotoId)];
				}
			}

			const normalizedPhotos = sortedPhotos.map((p) => ({
				...p,
				url: normalizePhotoUrl(p.url)
			}));

			return {
				...album,
				photoCount: photos.length,
				previewPhotos: normalizedPhotos.slice(0, 4),
				coverUrl: normalizedPhotos[0]?.url || null
			};
		})
	);

	return {
		albums: albumsWithPhotos
	};
};

export const actions = {
	deleteAlbum: async ({ request, locals }) => {
		if (!locals.isAdmin) {
			return fail(403, { error: 'Unauthorized. Admin privileges required.' });
		}

		const formData = await request.formData();
		const albumId = Number.parseInt(String(formData.get('albumId')), 10);

		if (Number.isNaN(albumId)) {
			return fail(400, { error: 'Invalid Album ID.' });
		}

		const [album] = await db.select().from(albumsTable).where(eq(albumsTable.id, albumId));
		if (!album) {
			return fail(404, { error: 'Album not found.' });
		}

		try {
			// 1. Find all photo records to remove their files from disk
			const photos = await db.select().from(photosTable).where(eq(photosTable.albumId, albumId));

			for (const photo of photos) {
				if (photo.url.includes('/uploads/')) {
					const relPath = photo.url.substring(photo.url.indexOf('/uploads/') + '/uploads/'.length);
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

			// 2. Remove album folder from uploads/ if it exists
			const folderName = getAlbumFolderName(album.title);
			const albumDir = path.resolve('uploads', folderName);
			if (fs.existsSync(albumDir)) {
				try {
					fs.rmSync(albumDir, { recursive: true, force: true });
				} catch (e) {
					console.error('Failed to delete album directory:', albumDir, e);
				}
			}

			// 3. Delete DB records
			await db.delete(photosTable).where(eq(photosTable.albumId, albumId));
			await db.delete(albumsTable).where(eq(albumsTable.id, albumId));

			return {
				success: true,
				action: 'deleteAlbum',
				deletedAlbumId: albumId,
				deletedAlbumTitle: album.title
			};
		} catch (err) {
			console.error('Failed to delete album:', err);
			return fail(500, { error: 'Failed to delete album and its photos.' });
		}
	}
} satisfies Actions;
