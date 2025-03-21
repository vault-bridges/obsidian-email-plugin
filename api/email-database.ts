import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/libsql/node'
import type { ParsedMail } from 'mailparser'
import * as schema from './schema.ts'

export type EmailMessage = typeof schema.emails.$inferSelect & {
	attachments: Array<typeof schema.attachments.$inferSelect>
}

export class EmailDatabase {
	private db: ReturnType<typeof drizzle<typeof schema>>

	constructor(dbPath: string) {
		this.db = drizzle({ connection: `file:${dbPath}`, schema })
	}

	async saveEmail(email: ParsedMail) {
		const { messageId, subject, from, to, date, html, text, attachments } = email

		if (!messageId) {
			throw new Error('Missing messageId')
		}

		await this.db.transaction(async (tx) => {
			await tx.insert(schema.emails).values({
				messageId: messageId,
				subject: subject || null,
				fromAddress: from?.text || null,
				toAddress: Array.isArray(to) ? to.map((t) => t.text).join(', ') || null : to?.text || null,
				date: date || null,
				htmlContent: html || null,
				textContent: text || null,
			})

			if (attachments && attachments.length > 0) {
				for (const attachment of attachments) {
					await tx.insert(schema.attachments).values({
						emailMessageId: messageId,
						filename: attachment.filename || null,
						mimetype: attachment.contentType || null,
						content: Buffer.isBuffer(attachment.content)
							? attachment.content
							: Buffer.from(attachment.content as Uint8Array),
					})
				}
			}
		})

		const foundEmail = await this.db.query.emails.findFirst({
			where: eq(schema.emails.messageId, messageId),
			with: { attachments: { columns: { content: false } } },
		})
		if (!foundEmail) {
			throw new Error('Failed to find saved email')
		}
		return foundEmail as EmailMessage
	}

	async getEmailsForPlugin(pluginId: string) {
		// Retrieve emails matching plugin criteria
		// This is a placeholder implementation
		const result = await this.db.select().from(schema.emails).all()

		// Convert to EmailMessage format
		return result.map((email) => ({
			id: email.messageId,
			pluginId,
			from: email.fromAddress || '',
			to: email.toAddress || '',
			subject: email.subject || '',
			body: email.htmlContent || email.textContent || '',
			metadata: {
				receivedAt: email.date ? new Date(email.date) : new Date(),
				processed: true,
			},
		}))
	}
}
