import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const galleryTable = sqliteTable('gallery', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	title: text('title').notNull(),
	category: text('category').default('General'),
	url: text('url').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.$defaultFn(() => new Date())
		.default(sql`(strftime('%s', 'now'))`)
});

export type GalleryItem = typeof galleryTable.$inferSelect;
export type InsertGalleryItem = typeof galleryTable.$inferInsert;
