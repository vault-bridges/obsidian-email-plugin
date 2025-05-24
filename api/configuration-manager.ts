import { get } from 'es-toolkit/compat'
import process from 'process'

interface ServiceConfiguration {
	api: {
		host: string
		port: number
		token: string
	}
	smtp: {
		host: string
		port: number
		secure: boolean
		proxy: boolean
		key: string
		cert: string
		domain: string
	}
	database: {
		path: string
	}
	security: {
		rateLimiting: {
			maxEmailsPerMinute: number
			maxPluginsPerUser: number
		}
		webhookValidation: boolean
	}
}

export class ConfigurationManager {
	private config!: ServiceConfiguration

	constructor() {
		this.loadConfiguration()
	}

	private loadConfiguration() {
		this.config = {
			api: {
				host: process.env.API_HOST || 'localhost',
				port: Number.parseInt(process.env.API_PORT || '80'),
				token: process.env.API_TOKEN || '<PASSWORD>',
			},
			smtp: {
				host: process.env.SMTP_HOST || 'localhost',
				port: Number.parseInt(process.env.SMTP_PORT || '25'),
				secure: process.env.SMTP_SECURE === 'true',
				proxy: process.env.SMTP_PROXY === 'true',
				key: process.env.SMTP_KEY || 'key.pem',
				cert: process.env.SMTP_CERT || 'cert.pem',
				domain: process.env.SMTP_DOMAIN || 'localhost',
			},
			database: {
				path: process.env.DB_PATH || './emails.db',
			},
			security: {
				rateLimiting: {
					maxEmailsPerMinute: 100,
					maxPluginsPerUser: 5,
				},
				webhookValidation: true,
			},
		}
	}

	get<Key extends string>(key: Key) {
		return get(this.config, key)
	}
}
