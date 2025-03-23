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
		this.db = drizzle({ connection: `file:${dbPath}`, casing: 'snake_case', schema })
	}

	async saveEmail(email: ParsedMail) {
		const { messageId, subject, from, to, date, html, text, attachments } = email

		if (!messageId) {
			throw new Error('Missing messageId')
		}

		return await this.db.transaction(async (tx) => {
			const [emailId] = await tx
				.insert(schema.emails)
				.values({
					messageId,
					subject: subject || null,
					fromAddress: from?.text || null,
					toAddress: Array.isArray(to)
						? to.map((t) => t.text).join(', ') || null
						: to?.text || null,
					date: date || null,
					htmlContent: html || null,
					textContent: text || null,
				})
				.returning({ id: schema.emails.id })

			if (!emailId?.id) {
				throw new Error('Failed to save email')
			}

			if (attachments && attachments.length > 0) {
				for (const attachment of attachments) {
					await tx.insert(schema.attachments).values({
						emailId: emailId.id,
						filename: attachment.filename || null,
						mimetype: attachment.contentType || null,
						content: Buffer.isBuffer(attachment.content)
							? attachment.content
							: Buffer.from(attachment.content as Uint8Array),
					})
				}
			}
			return emailId.id
		})
	}

	async getEmail(emailId: number) {
		const foundEmail = await this.db.query.emails.findFirst({
			where: eq(schema.emails.id, emailId),
		})
		const foundAttachments = await this.db.query.attachments.findMany({
			where: eq(schema.attachments.emailId, emailId),
		})
		if (!foundEmail) {
			throw new Error('Failed to find saved email')
		}
		return { ...foundEmail, attachments: foundAttachments }
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
