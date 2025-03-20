import { blob, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const emails = sqliteTable('emails', {
	id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
	messageId: text().unique().notNull(),
	subject: text(),
	fromAddress: text(),
	toAddress: text(),
	date: integer({ mode: 'timestamp' }),
	htmlContent: text(),
	textContent: text(),
})

export const attachments = sqliteTable('attachments', {
	id: integer().primaryKey({ autoIncrement: true }),
	emailMessageId: text()
		.notNull()
		.references(() => emails.messageId),
	filename: text(),
	mimetype: text(),
	content: blob({ mode: 'buffer' }),
})
