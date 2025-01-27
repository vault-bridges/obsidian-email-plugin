import { readFileSync } from 'node:fs'
import { authenticate } from 'mailauth'
import { simpleParser } from 'mailparser'
import { SMTPServer, type SMTPServerDataStream, type SMTPServerSession } from 'smtp-server'
import { ConfigurationManager } from './configuration-manager.ts'
import { EmailDatabase } from './email-database.ts'

export class EmailIngestService {
	private smtpServer!: SMTPServer
	// private apiService: PluginAPIService
	private database: EmailDatabase
	// private pluginRegistry: PluginRegistry
	private configManager: ConfigurationManager

	constructor() {
		this.configManager = new ConfigurationManager()
		this.database = new EmailDatabase(this.configManager.get('database.path'))
		// this.pluginRegistry = new PluginRegistry()

		this.initializeServices()
	}

	start() {
		// Start SMTP server
		this.smtpServer.listen(this.configManager.get('smtp.port'), this.configManager.get('smtp.host'))

		/*		// Start API service
		const app = new Hono()
		app.route('/api', this.apiService.routes)

		Bun.serve({
			port: 3000,
			fetch: app.fetch,
		})*/
	}

	private initializeServices() {
		// Initialize SMTP server
		this.smtpServer = new SMTPServer({
			logger: true,
			authOptional: true,
			secure: this.configManager.get('smtp.secure'),
			key: readFileSync(this.configManager.get('smtp.key')),
			cert: readFileSync(this.configManager.get('smtp.cert')),
			onData: this.processIncomingEmail.bind(this),
		})
		this.smtpServer.on('error', (error) => {
			console.error(error)
		})

		// Initialize API service
		// this.apiService = new PluginAPIService(this.pluginRegistry, this.database)
	}

	private async processIncomingEmail(
		stream: SMTPServerDataStream,
		session: SMTPServerSession,
		callback: (error: Error | null) => void,
	) {
		const parsed = await simpleParser(stream, {}).catch((error) => {
			console.log(error)
		})

		if (!parsed) {
			callback(new Error('Failed to parse email'))
			return
		}

		const { spf, dkim } = await authenticate(stream, {
			ip: session.remoteAddress,
			helo: session.clientHostname,
			sender: parsed.from?.text,
		})

		console.log('SPF Result:', spf)
		console.log('DKIM Result:', dkim)

		// check email status
		if (spf.status.result !== 'pass' || dkim.results[0]?.status.result !== 'pass') {
			console.log('SPF or DKIM check failed')
			// return callback(new Error('SPF or DKIM check failed'))
		}

		console.log('Received message:', parsed.text)

		await this.database.saveEmail(parsed)
		callback(null)
	}
}

const emailIngestService = new EmailIngestService()
emailIngestService.start()
