import { DatabaseSync } from 'node:sqlite'
import type { Attachment, ParsedMail } from 'mailparser'

export class EmailDatabase {
	private db: DatabaseSync

	constructor(dbPath: string) {
		this.db = new DatabaseSync(dbPath, { open: true })
		this.initializeSchema()
	}

	async saveEmail(email: ParsedMail): Promise<void> {
		try {
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

			const insert = this.db.prepare(query)
			insert.run(
				messageId || null,
				subject || null,
				from?.text || null,
				Array.isArray(to) ? to.map((t) => t.text).join(', ') || null : to?.text || null,
				date instanceof Date ? date.toISOString() : null,
				html || null,
				text || null,
			)

			// Save attachments (if any)
			if (attachments && attachments.length > 0) {
				for (const attachment of attachments) {
					await this.saveAttachment(messageId as string, attachment)
				}
			}

			console.log('Email saved successfully')
		} catch (error) {
			console.error('Error saving email:', error)
			throw error
		}
	}

	async saveAttachment(messageId: string, attachment: Attachment): Promise<void> {
		const attachQuery = `
			INSERT INTO attachments (emailMessageId, filename, mimetype, content)
			VALUES (?, ?, ?, ?)
		`

		const insert = this.db.prepare(attachQuery)
		insert.run(
			messageId,
			attachment.filename || null,
			attachment.contentType || null,
			// Convert Buffer content to a Blob-safe format if necessary
			attachment.content instanceof Buffer
				? attachment.content
				: Buffer.from(attachment.content as Uint8Array),
		)
	}

	// async getEmailsForPlugin(pluginId: string): Promise<EmailMessage[]> {
	// Retrieve emails matching plugin criteria
	// }

	initializeSchema() {
		this.db.exec(`
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

		this.db.exec(`
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
