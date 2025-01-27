import { readFileSync } from 'node:fs'
import { PassThrough } from 'node:stream'
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
		const passStreamParser = new PassThrough()
		const passStreamAuth = new PassThrough()

		stream.pipe(passStreamParser)
		stream.pipe(passStreamAuth)

		const parsed = await simpleParser(passStreamParser, {}).catch((error) => {
			console.log(error)
		})

		if (!parsed) {
			return callback(new Error('Failed to parse email'))
		}

		const { spf, dkim, dmarc } = await authenticate(passStreamAuth, {
			ip: session.remoteAddress,
			helo: session.clientHostname,
			sender: parsed.from?.value?.at(0)?.address,
		})

		console.log('SPF Result:', spf)
		console.log('DKIM Result:', dkim)
		console.log('DMARC Result:', dmarc)

		// check email status
		if (
			spf.status.result !== 'pass' ||
			dkim.results[0]?.status.result !== 'pass' ||
			dmarc.status.result !== 'pass'
		) {
			console.log('SPF, DKIM or DMARK check failed')
			return callback(new Error('SPF, DKIM or DMARK check failed'))
		}

		console.log('Received message:', parsed.text)

		await this.database.saveEmail(parsed)
		callback(null)
	}
}

const emailIngestService = new EmailIngestService()
emailIngestService.start()
