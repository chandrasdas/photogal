import { db } from '$lib/server/db';
import { albumsTable, photosTable } from '$lib/server/schema';
import { desc, eq, asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const allAlbums = await db.select().from(albumsTable).orderBy(desc(albumsTable.createdAt));

	const albumsWithPhotos = await Promise.all(
		allAlbums.map(async (album) => {
			const photos = await db
				.select()
				.from(photosTable)
				.where(eq(photosTable.albumId, album.id))
				.orderBy(asc(photosTable.id));

			return {
				...album,
				photoCount: photos.length,
				previewPhotos: photos.slice(0, 4),
				coverUrl: photos[0]?.url || null
			};
		})
	);

	return {
		albums: albumsWithPhotos
	};
};
