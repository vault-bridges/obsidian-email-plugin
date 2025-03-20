import { vValidator } from '@hono/valibot-validator'
import type { PluginRegistry } from './plugin-registry.js'
import { Hono } from 'hono'
import { url, array, object, optional, pipe, string, type InferInput } from 'valibot'
import type { EmailDatabase } from './email-database.js'
import { HTTPException } from 'hono/http-exception'

const PluginRegistrationSchema = object({
	id: string(),
	name: string(),
	webhookUrl: pipe(string(), url()),
	filterRules: object({
		fromEmail: optional(array(string())),
		subjectContains: optional(array(string())),
		bodyContains: optional(array(string())),
	}),
})

export type PluginRegistration = InferInput<typeof PluginRegistrationSchema>

export class PluginAPIService {
	private pluginRegistry: PluginRegistry
	private database: EmailDatabase

	constructor(pluginRegistry: PluginRegistry, database: EmailDatabase) {
		this.pluginRegistry = pluginRegistry
		this.database = database
	}

	initializeRoutes() {
		const app = new Hono()

		// Plugin Registration Endpoint
		app.post('/plugins/register', vValidator('json', PluginRegistrationSchema), async (c) => {
			const pluginData = c.req.valid('json')
			const result = this.pluginRegistry.registerPlugin(pluginData)
			return c.json(result, 201)
		})

		// Email Retrieval Endpoint
		app.get('/emails', async (context) => {
			const pluginId = context.req.query('pluginId')
			if (!pluginId) throw new HTTPException(401, { message: 'Missing pluginId' })
			const emails = await this.database.getEmailsForPlugin(pluginId)
			return context.json(emails)
		})

		// Long-polling Endpoint
		app.get('/emails/stream', async (c) => {
			const pluginId = c.req.query('pluginId')
			if (!pluginId) throw new HTTPException(401, { message: 'Missing pluginId' })
			return this.createEmailStream(pluginId, c)
		})
		return app
	}

	private async createEmailStream(pluginId: string, context: any) {
		// Implement server-sent events or long-polling
		const stream = new ReadableStream({
			start(controller) {
				// Setup event listeners for new emails
			},
		})

		return context.stream(stream)
	}
}
