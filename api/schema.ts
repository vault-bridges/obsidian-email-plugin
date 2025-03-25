import { relations, sql } from 'drizzle-orm'
import { blob, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const emails = sqliteTable('emails', {
	id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
	messageId: text().notNull(),
	subject: text(),
	fromAddress: text(),
	toAddress: text(),
	date: integer({ mode: 'timestamp' }),
	htmlContent: text(),
	textContent: text(),
	createdAt: integer({ mode: 'number' }).notNull().default(sql`(unixepoch())`),
})

export const attachments = sqliteTable('attachments', {
	id: integer().primaryKey({ autoIncrement: true }),
	emailId: integer()
		.notNull()
		.references(() => emails.id),
	filename: text(),
	mimetype: text(),
	content: blob({ mode: 'buffer' }),
})

export const emailsRelations = relations(emails, ({ many }) => ({
	attachments: many(attachments),
}))

export const attachmentsRelations = relations(attachments, ({ one }) => ({
	email: one(emails, {
		fields: [attachments.emailId],
		references: [emails.id],
	}),
}))
