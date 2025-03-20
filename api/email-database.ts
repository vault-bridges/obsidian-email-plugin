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

	async saveEmail(email: ParsedMail): Promise<EmailMessage> {
		const { messageId, subject, from, to, date, html, text, attachments } = email

		return this.db.transaction(async (tx) => {
			const [emailId] = await tx
				.insert(schema.emails)
				.values({
					messageId: messageId || '',
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

			if (attachments && attachments.length > 0) {
				await tx.insert(schema.attachments).values(
					attachments.map((attachment) => ({
						emailMessageId: messageId as string,
						filename: attachment.filename || null,
						mimetype: attachment.contentType || null,
						content:
							attachment.content instanceof Buffer
								? attachment.content
								: Buffer.from(attachment.content as Uint8Array),
					})),
				)
			}
			if (!emailId) {
				throw new Error('Failed to save email')
			}
			const foundEmail = await this.db.query.emails.findFirst({
				where: eq(schema.emails.id, emailId.id),
				with: { attachments: true },
			})
			if (!foundEmail) {
				throw new Error('Failed to find saved email')
			}
			return foundEmail
		})
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
