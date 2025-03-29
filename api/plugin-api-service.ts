import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { streamSSE, type SSEStreamingApi } from 'hono/streaming'
import type { ConfigurationManager } from './configuration-manager.ts'
import type { EmailDatabase } from './email-database.ts'

export class PluginAPIService {
	private database: EmailDatabase
	private configManager: ConfigurationManager
	private activeStreams: Set<SSEStreamingApi> = new Set()
	private emailNotificationId = 0

	constructor(database: EmailDatabase, configManager: ConfigurationManager) {
		this.database = database
		this.configManager = configManager
	}

	/**
	 * Notify all connected clients about a new email
	 */
	notifyNewEmail(emailId: number) {
		// Send notification to all active streams
		for (const stream of this.activeStreams) {
			stream
				.writeSSE({
					data: JSON.stringify({ emailId }),
					event: 'new-email',
					id: String(this.emailNotificationId++),
				})
				.catch((error) => {
					console.error('Error sending SSE notification:', error)
					// Remove failed stream
					this.activeStreams.delete(stream)
				})
		}
	}

	initializeRoutes() {
		const app = new Hono()

		app.use(
			'*',
			cors({
				origin: ['app://obsidian.md'],
				allowHeaders: ['Authorization', 'Cache-Control', 'Content-Type'],
			}),
			bearerAuth({ token: this.configManager.get('api.token') }),
		)

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

		app.get('/notify', async (c) =>
			streamSSE(c, async (stream) => {
				// Register this stream
				this.activeStreams.add(stream)

				// Send initial connection confirmation
				await stream.writeSSE({
					data: JSON.stringify({ connected: true, timestamp: Date.now() }),
					event: 'connected',
					id: '0',
				})

				try {
					// Keep the connection alive with heartbeats
					while (true) {
						await stream.sleep(30000) // 30 seconds heartbeat
						await stream.writeSSE({
							data: JSON.stringify({ heartbeat: true, timestamp: Date.now() }),
							event: 'heartbeat',
							id: 'heartbeat',
						})
					}
				} catch (error) {
					console.error('SSE stream error:', error)
				} finally {
					// Clean up when the connection is closed
					this.activeStreams.delete(stream)
				}
			}),
		)

		return app
	}
}
