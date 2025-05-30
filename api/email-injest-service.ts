import { serve } from '@hono/node-server'
import { readFileSync } from 'node:fs'
import { Buffer } from 'node:buffer'
import { authenticate } from 'mailauth'
import { simpleParser } from 'mailparser'
import { SMTPServer, type SMTPServerDataStream, type SMTPServerSession } from 'smtp-server'
import { ConfigurationManager } from './configuration-manager.ts'
import { EmailDatabase } from './email-database.ts'
import { PluginAPIService } from './plugin-api-service.ts'

export class EmailIngestService {
	private smtpServer!: SMTPServer
	private apiService!: PluginAPIService
	private database: EmailDatabase
	private configManager: ConfigurationManager

	constructor() {
		this.configManager = new ConfigurationManager()
		this.database = new EmailDatabase(this.configManager.get('database.path'))

		this.initializeServices()
	}

	start() {
		// Start SMTP server
		this.smtpServer.listen(this.configManager.get('smtp.port'), this.configManager.get('smtp.host'))

		// Start API service
		const app = this.apiService.initializeRoutes()
		serve(
			{
				fetch: app.fetch,
				port: this.configManager.get('api.port'),
				hostname: this.configManager.get('api.host'),
			},
			(info) => {
				console.log(`Listening on ${info.address}:${info.port}`)
			},
		)
	}

	private initializeServices() {
		const key = this.configManager.get('smtp.key')
		const cert = this.configManager.get('smtp.cert')
		// Initialize SMTP server
		this.smtpServer = new SMTPServer({
			logger: true,
			authOptional: true,
			useProxy: this.configManager.get('smtp.proxy'),
			secure: this.configManager.get('smtp.secure'),
			key: key ? readFileSync(key) : undefined,
			cert: cert ? readFileSync(cert) : undefined,
			onData: this.processIncomingEmail.bind(this),
		})
		this.smtpServer.on('error', (error) => {
			console.error(error)
		})

		// Initialize API service
		this.apiService = new PluginAPIService(this.database, this.configManager)
	}

	private async processIncomingEmail(
		stream: SMTPServerDataStream,
		session: SMTPServerSession,
		callback: (error: Error | null) => void,
	) {
		const domainError = await this.checkDomain(session)
		if (domainError) return callback(domainError)

		const buffer = Buffer.concat(await Array.fromAsync(stream))

		const authError = await this.authenticateEmail(buffer, session)
		if (authError) return callback(authError)

		const parsed = await this.parseEmail(buffer)
		if (parsed instanceof Error) return callback(parsed)

		const emailId = await this.database.saveEmail(parsed)
		console.log('Email saved, id: ', emailId)
		this.apiService.notifyNewEmail(emailId)

		// Get the email from the database to pass to notifyPlugins
		const emailMessage = await this.database.getEmailById(emailId)
		if (emailMessage) {
			// Notify the API service about the new email
		}

		callback(null)
	}

	private async checkDomain(session: SMTPServerSession) {
		const allowedDomain = this.configManager.get('smtp.domain')
		const recipientDomain = session.envelope.rcptTo[0]?.address.split('@')[1]

		if (!recipientDomain) {
			return this.logAndReturnError('No recipient domain found')
		}

		if (recipientDomain !== allowedDomain) {
			return this.logAndReturnError(`Emails to domain ${recipientDomain} are not allowed`)
		}
	}

	private async authenticateEmail(buffer: Buffer, session: SMTPServerSession) {
		console.log('session', JSON.stringify(session, null, 2))
		if (!session.envelope.mailFrom) {
			return this.logAndReturnError('No sender address found in envelope')
		}

		// Skip authentication in test mode
		if (process.env.NODE_ENV === 'test') {
			console.log('Skipping email authentication in test mode')
			return
		}

		const { spf, dkim, dmarc } = await authenticate(buffer, {
			ip: session.remoteAddress,
			helo: session.clientHostname,
			sender: session.envelope.mailFrom.address,
		})

		if (spf.status.result !== 'pass') {
			console.error(`SPF check failed, ${spf.status.result}`)
			// return this.logAndReturnError(`SPF check failed, ${spf.status.result}`)
		}

		if (dkim.results[0]?.status.result !== 'pass') {
			return this.logAndReturnError(`DKIM check failed, ${dkim.results[0]?.status.result}`)
		}

		if (dmarc.status.result !== 'pass') {
			return this.logAndReturnError(`DMARC check failed, ${dmarc.status.result}`)
		}
	}

	private async parseEmail(buffer: Buffer) {
		try {
			return await simpleParser(buffer, {})
		} catch (error) {
			if (error instanceof Error) {
				console.error(`Failed to parse email, ${error.message}, ${error.stack}`)
				return error
			}
			return this.logAndReturnError(`Failed to parse email, ${error}`)
		}
	}

	private logAndReturnError(message: string): Error {
		console.error(message)
		return new Error(message)
	}
}
