import type { EmailMessage } from './email-database.js'
import type { PluginRegistration } from './plugin-api-service.js'
// import { WebhookClient } from './webhook-client.ts'

export class PluginRegistry {
	private plugins: Map<string, PluginRegistration> = new Map()
	// private webhookClient: WebhookClient

	constructor() {
		// this.webhookClient = new WebhookClient()
	}

	registerPlugin(plugin: PluginRegistration) {
		// Validate and store plugin
		this.plugins.set(plugin.id, plugin)
		return { success: true, pluginId: plugin.id }
	}

	findMatchingPlugins(emailId: number): PluginRegistration[] {
		return Array.from(this.plugins.values()).filter((plugin) =>
			this.matchesPluginCriteria(email, plugin),
		)
	}

	private matchesPluginCriteria(emailMessage: EmailMessage, plugin: PluginRegistration): boolean {
		const rules = plugin.filterRules

		// From email matching
		if (rules.fromEmail?.length) {
			if (!rules.fromEmail.some((email) => email === emailMessage.fromAddress)) {
				return false
			}
		}

		// Subject matching
		if (rules.subjectContains?.length) {
			if (!rules.subjectContains.some((term) => emailMessage.subject?.includes(term))) {
				return false
			}
		}

		// Body matching
		if (rules.bodyContains?.length) {
			if (!rules.bodyContains.some((term) => emailMessage.textContent?.includes(term))) {
				return false
			}
		}

		return true
	}

	async notifyPlugins(emailId: number) {
		const matchingPlugins = this.findMatchingPlugins(emailId)

		for (const plugin of matchingPlugins) {
			try {
				// await this.webhookClient.send(plugin.webhookUrl, {
				// 	emailId: email.id,
				// 	pluginId: plugin.id,
				// 	emailData: this.sanitizeEmailForWebhook(email),
				// })
			} catch (error) {
				this.logWebhookError(plugin, error)
			}
		}
	}

	private sanitizeEmailForWebhook(email: EmailMessage) {
		// Remove sensitive information before sending
		return {
			id: email.id,
			from: email.fromAddress,
			subject: email.subject,
			body: this.truncateBody(email.textContent || email.htmlContent || ''),
			attachments: email.attachments?.map((att) => ({
				filename: att.filename,
				contentType: att.mimetype,
			})),
		}
	}

	private truncateBody(body: string) {
		return body.substring(0, 100) + '...'
	}

	private logWebhookError(plugin: PluginRegistration, error: any) {
		console.error(`Failed to notify plugin ${plugin.id}, ${error}`)
	}
}
