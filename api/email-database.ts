import { Database } from 'bun:sqlite'
import type { Attachment, ParsedMail } from 'mailparser'

export class EmailDatabase {
	private db: Database

	constructor(dbPath: string) {
		this.db = new Database(dbPath, { create: true })
		this.initializeSchema()
	}

	async saveEmail(email: ParsedMail): Promise<void> {
		const query = `
			INSERT INTO emails (messageId,
								subject,
								fromAddress,
								toAddress,
								date,
								htmlContent,
								textContent)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`

		const { messageId, subject, from, to, date, html, text, attachments } = email

		this.db.run(query, [
			messageId || null,
			subject || null,
			from?.text || null,
			Array.isArray(to) ? to.map((t) => t.text).join(', ') || null : to?.text || null,
			date instanceof Date ? date.toISOString() : null,
			html || null,
			text || null,
		])

		// Save attachments (if any)
		if (attachments && attachments.length > 0) {
			for (const attachment of attachments) {
				await this.saveAttachment(messageId as string, attachment)
			}
		}
	}

	async saveAttachment(messageId: string, attachment: Attachment): Promise<void> {
		const attachQuery = `
			INSERT INTO attachments (emailMessageId, filename, mimetype, content)
			VALUES (?, ?, ?, ?)
		`

		this.db.run(attachQuery, [
			messageId,
			attachment.filename || null,
			attachment.contentType || null,
			// Convert Buffer content to a Blob-safe format if necessary
			attachment.content instanceof Buffer
				? attachment.content
				: Buffer.from(attachment.content as Uint8Array),
		])
	}

	// async getEmailsForPlugin(pluginId: string): Promise<EmailMessage[]> {
	// Retrieve emails matching plugin criteria
	// }

	initializeSchema() {
		this.db.run(`
			CREATE TABLE IF NOT EXISTS emails (
				id INTEGER PRIMARY KEY,
				messageId TEXT UNIQUE,
				subject TEXT,
				fromAddress TEXT,
				toAddress TEXT,
				date TEXT,
				htmlContent TEXT,
				textContent TEXT
			)
		`)

		this.db.run(`
			CREATE TABLE IF NOT EXISTS attachments (
				id INTEGER PRIMARY KEY,
				emailMessageId TEXT,
				filename TEXT,
				mimetype TEXT,
				content BLOB,
				FOREIGN KEY (emailMessageId) REFERENCES emails(messageId)
			)
		`)
	}
}
