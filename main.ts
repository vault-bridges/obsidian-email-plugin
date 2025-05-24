import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian'
import { EventSource } from 'eventsource'
import type { EmailMessage } from './api/email-database.ts'

interface EmailPluginSettings {
	serviceUrl: string
	serviceApiKey: string
	emailSavePath: string
	lastEmailFetchTimestamp: number
}

const DEFAULT_SETTINGS: EmailPluginSettings = {
	serviceUrl: 'https://api.example.com',
	serviceApiKey: '',
	emailSavePath: 'emails',
	lastEmailFetchTimestamp: 0,
}

export default class EmailPlugin extends Plugin {
	settings!: EmailPluginSettings
	private eventSource: EventSource | null = null

	override async onload() {
		await this.loadSettings()

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new EmailPluginSettingTab(this.app, this))

		this.app.workspace.onLayoutReady(async () => {
			// Connect to the notification API
			this.connectToNotificationApi()

			// Check emails
			await this.fetchAndProcessEmails()
		})
	}

	override onunload() {
		// Close the notification connection if it exists
		if (this.eventSource) {
			this.eventSource.close()
			this.eventSource = null
		}
	}

	/**
	 * Fetches an email by its ID from the API
	 * @param emailId The ID of the email to fetch
	 * @returns The email data or null if there was an error
	 */
	async fetchEmail(emailId: number) {
		const url = new URL(`/emails/${emailId}`, this.settings.serviceUrl)
		const response = await this.apiRequest(url)
		return (await response?.json()) as EmailMessage | null
	}

	async fetchAttachment(emailId: number, attachmentId: number): Promise<ArrayBuffer | null> {
		const url = new URL(`/emails/${emailId}/attachments/${attachmentId}`, this.settings.serviceUrl)
		const response = await this.apiRequest(url)
		return (await response?.arrayBuffer()) as ArrayBuffer | null
	}

	private getUniqFilename(filename: string) {
		const ext = filename.split('.').pop()
		const base = filename.split('.').slice(0, -1).join('.')
		const path = this.settings.emailSavePath
		if (!this.app.vault.getFileByPath(`${path}/${filename}`)) {
			return filename
		}
		let duplicateCount = 1
		while (this.app.vault.getFileByPath(`${path}/${base} (${duplicateCount}).${ext}`)) {
			duplicateCount++
		}
		return `${base} (${duplicateCount}).${ext}`
	}

	private async ensureEmailSavePathExists() {
		if (!this.app.vault.getFolderByPath(this.settings.emailSavePath)) {
			await this.app.vault.createFolder(this.settings.emailSavePath)
		}
	}

	/**
	 * Process a single email - create a note and handle attachments
	 * @param email The email to process
	 */
	private async processEmail(email: EmailMessage) {
		console.log('Processing email:', email)
		await this.ensureEmailSavePathExists()
		const noteFilePath = `${this.settings.emailSavePath}/${this.getUniqFilename(`${email.subject}.md`)}`
		const noteFile = await this.app.vault.create(
			noteFilePath,
			email.htmlContent || email.textContent || 'no content',
		)

		if (email.attachments.length > 0) {
			console.log('Downloading attachments...')
			await this.app.vault.append(noteFile, 'Attachments:\n')

			for (const attachment of email.attachments) {
				const attachmentData = await this.fetchAttachment(email.id, attachment.id)
				if (attachmentData) {
					console.log(`Downloaded attachment ${attachment.filename}`)
					const attachmentFileName = this.getUniqFilename(attachment.filename || 'attachment.bin')
					const attachmentFilePath = `${this.settings.emailSavePath}/${attachmentFileName}`
					await this.app.vault.append(noteFile, `- [[${attachmentFileName}]]\n`)
					await this.app.vault.createBinary(attachmentFilePath, attachmentData)
				}
			}
		}

		return noteFile
	}

	/**
	 * Make an API request with proper headers and error handling
	 * @param url The API URL
	 * @returns The response or null if there was an error
	 */
	private async apiRequest(url: URL) {
		try {
			const response = await fetch(url.toString(), {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${this.settings.serviceApiKey}`,
				},
			})

			if (!response.ok) {
				throw new Error(`API request failed: ${response.status} ${response.statusText}`)
			}

			return response
		} catch (error) {
			console.error(`Error in API request to ${url}:`, error)
			if (error instanceof Error) {
				new Notice(`API request failed: ${error.message}`)
			}
			return null
		}
	}

	private async fetchAndProcessEmails() {
		// Fetch new emails since last check
		const params = {
			since: (this.settings.lastEmailFetchTimestamp + 1).toString(),
		}

		const url = new URL('/emails', this.settings.serviceUrl)
		url.search = new URLSearchParams(params).toString()
		const response = await this.apiRequest(url)
		const emails = (await response?.json()) as EmailMessage[] | null

		if (emails) {
			console.log(`Fetched ${emails.length} new emails`)

			// Process each email
			for (const email of emails) {
				await this.processEmail(email)

				new Notice(`New email received! ID: ${email.id} Subject: ${email.subject}`)
			}

			// Update the timestamp to the current time and save settings
			this.settings.lastEmailFetchTimestamp = Date.now()
			await this.saveSettings()
		}
	}

	private connectToNotificationApi() {
		console.log('Connecting to notification API...')
		let timeout: ReturnType<typeof setTimeout> | null = null
		try {
			if (this.eventSource) {
				this.eventSource.close()
				this.eventSource = null
			}

			// Create a new EventSource connection to the /notify endpoint
			// This custom implementation supports authorization headers
			const url = new URL('/notify', this.settings.serviceUrl).toString()

			this.eventSource = new EventSource(url, {
				fetch: (input, init) =>
					fetch(input, {
						...init,
						headers: {
							...init.headers,
							Authorization: `Bearer ${this.settings.serviceApiKey}`,
							Accept: 'text/event-stream',
							'Cache-Control': 'no-cache',
						},
					}),
			})

			// Handle connection established
			this.eventSource.addEventListener('connected', (event: MessageEvent) => {
				console.log('Connected to notification API:', event.data)
				new Notice('Connected to email notification service')
				timeout = setTimeout(this.connectToNotificationApi.bind(this), 60000)
			})

			// Handle heartbeat to keep connection alive
			this.eventSource.addEventListener('heartbeat', (event: MessageEvent) => {
				console.log('Notification heartbeat:', event.data)
				if (timeout) {
					clearTimeout(timeout)
					timeout = setTimeout(this.connectToNotificationApi.bind(this), 60000)
				}
			})

			// Handle new email notifications
			this.eventSource.addEventListener('new-email', async (event: MessageEvent) => {
				const data = JSON.parse(event.data)
				console.log('New email notification received:', data)
				new Notice(`New email received! ID: ${data.emailId}`)

				// Update the timestamp to current time and save settings
				this.settings.lastEmailFetchTimestamp = Date.now()
				await this.saveSettings()

				// Fetch the email details using the fetchEmail method
				const email = await this.fetchEmail(data.emailId)
				if (email) {
					console.log('Fetched email details:', email)
					const noteFile = await this.processEmail(email)
					console.log('Email processed and saved to:', noteFile.path)
				}
			})

			this.eventSource.addEventListener('error', (event: MessageEvent) => {
				console.log('Notification API connection error:', event.data)
				new Notice('Failed to connect to email notification service')
			})

			this.eventSource.addEventListener('abort', (event: MessageEvent) => {
				console.log('Notification API connection aborted:', event.data)
			})

			// Handle errors
			this.eventSource.onerror = (error) => {
				console.error('Notification API connection error:', error)
				new Notice('Failed to connect to email notification service')

				// Close and reset the connection on error
				if (this.eventSource) {
					this.eventSource.close()
					this.eventSource = null
				}

				// Try to reconnect after a delay
				setTimeout(() => {
					if (!this.eventSource) {
						this.connectToNotificationApi()
					}
				}, 10000) // Retry after 10 seconds
			}
		} catch (error) {
			console.error('Failed to connect to notification API:', error)
			new Notice('Failed to connect to email notification service')
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}
}

class EmailPluginSettingTab extends PluginSettingTab {
	plugin: EmailPlugin

	constructor(app: App, plugin: EmailPlugin) {
		super(app, plugin)
		this.plugin = plugin
	}

	display(): void {
		const { containerEl } = this

		containerEl.empty()

		new Setting(containerEl)
			.setName('Service URL')
			.setDesc('URL of the email service API')
			.addText((text) =>
				text
					.setPlaceholder('https://api.example.com')
					.setValue(this.plugin.settings.serviceUrl)
					.onChange(async (value) => {
						this.plugin.settings.serviceUrl = value
						await this.plugin.saveSettings()
					}),
			)

		new Setting(containerEl)
			.setName('Service API Key')
			.setDesc('API key for authentication with the email service')
			.addText((text) =>
				text
					.setPlaceholder('Enter your API key')
					.setValue(this.plugin.settings.serviceApiKey)
					.onChange(async (value) => {
						this.plugin.settings.serviceApiKey = value
						await this.plugin.saveSettings()
					}),
			)

		new Setting(containerEl)
			.setName('Email Save Path')
			.setDesc('Path where emails will be saved')
			.addText((text) =>
				text
					.setPlaceholder('./emails')
					.setValue(this.plugin.settings.emailSavePath)
					.onChange(async (value) => {
						this.plugin.settings.emailSavePath = value
						await this.plugin.saveSettings()
					}),
			)
	}
}
