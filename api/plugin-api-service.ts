import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import { url, array, object, optional, pipe, string, type InferInput } from 'valibot'
import type { ConfigurationManager } from './configuration-manager.js'
import type { EmailDatabase } from './email-database.js'
import { HTTPException } from 'hono/http-exception'

const PluginRegistrationSchema = object({
	id: string(),
	name: string(),
	webhookUrl: pipe(string(), url()),
	filterRules: object({
		fromEmail: optional(array(string())),
	}),
})

export type PluginRegistration = InferInput<typeof PluginRegistrationSchema>

export class PluginAPIService {
	private database: EmailDatabase
	private configManager: ConfigurationManager

	constructor(database: EmailDatabase, configManager: ConfigurationManager) {
		this.database = database
		this.configManager = configManager
	}

	initializeRoutes() {
		const app = new Hono()

		app.use('*', bearerAuth({ token: this.configManager.get('api.token') }))

		app.get('/emails/:emailId', async (context) => {
			const emailId = Number(context.req.param('emailId'))
			if (!emailId) throw new HTTPException(401, { message: 'Missing emailId' })
			const email = await this.database.getEmailsById(emailId)
			if (!email) throw new HTTPException(404, { message: 'Email not found' })
			return context.json(email)
		})

		app.get('/emails', async (context) => {
			const since = Number(context.req.query('since'))
			if (!since) throw new HTTPException(401, { message: 'Missing since query parameter' })
			const emails = await this.database.getEmails(since)
			return context.json(emails)
		})

		return app
	}
}
