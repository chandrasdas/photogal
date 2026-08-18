import { sql, relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const albumsTable = sqliteTable('albums', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	title: text('title').notNull(),
	tag: text('tag').default('General').notNull(),
	eventDate: integer('event_date', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.$defaultFn(() => new Date())
		.default(sql`(strftime('%s', 'now'))`)
		.notNull()
});

export const photosTable = sqliteTable('photos', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	albumId: integer('album_id')
		.notNull()
		.references(() => albumsTable.id, { onDelete: 'cascade' }),
	url: text('url').notNull(),
	width: integer('width'),
	height: integer('height'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.$defaultFn(() => new Date())
		.default(sql`(strftime('%s', 'now'))`)
		.notNull()
});

export const albumsRelations = relations(albumsTable, ({ many }) => ({
	photos: many(photosTable)
}));

export const photosRelations = relations(photosTable, ({ one }) => ({
	album: one(albumsTable, {
		fields: [photosTable.albumId],
		references: [albumsTable.id]
	})
}));

export type Album = typeof albumsTable.$inferSelect;
export type InsertAlbum = typeof albumsTable.$inferInsert;
export type Photo = typeof photosTable.$inferSelect;
export type InsertPhoto = typeof photosTable.$inferInsert;
