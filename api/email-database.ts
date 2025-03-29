import { and, eq, gte } from 'drizzle-orm'
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

	getEmailById(emailId: number) {
		return this.db.query.emails.findFirst({
			where: eq(schema.emails.id, emailId),
			with: { attachments: { columns: { content: false } } },
		})
	}

	getEmails(since: number) {
		return this.db.query.emails.findMany({
			where: gte(schema.emails.createdAt, since),
			with: { attachments: { columns: { content: false } } },
		})
	}

	async getAttachmentContent(emailId: number, attachmentId: number) {
		const attachment = await this.db.query.attachments.findFirst({
			where: and(eq(schema.attachments.emailId, emailId), eq(schema.attachments.id, attachmentId)),
			columns: { content: true },
		})
		if (!attachment) return null
		return attachment.content
	}
}
