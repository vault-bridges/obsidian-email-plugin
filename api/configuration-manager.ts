import { get } from 'es-toolkit/compat'

interface ServiceConfiguration {
	smtp: {
		host: string
		port: number
		domain: string
	}
	database: {
		path: string
		maxConnections: number
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
			smtp: {
				host: process.env.SMTP_HOST || 'localhost',
				port: Number.parseInt(process.env.SMTP_PORT || '25'),
				domain: process.env.SMTP_DOMAIN || 'localhost',
			},
			database: {
				path: process.env.DB_PATH || './emails.db',
				maxConnections: Number.parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
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
