import {
	App,
	Editor,
	type MarkdownFileInfo,
	MarkdownView,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from 'obsidian'
import { SSE } from 'sse.js'

interface EmailPluginSettings {
	serviceUrl: string
	serviceApiKey: string
	emailSavePath: string
}

const DEFAULT_SETTINGS: EmailPluginSettings = {
	serviceUrl: 'https://api.example.com',
	serviceApiKey: '',
	emailSavePath: './emails',
}

export default class EmailPlugin extends Plugin {
	settings!: EmailPluginSettings
	private eventSource: SSE | null = null

	override async onload() {
		await this.loadSettings()

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (_evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!')
		})
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class')

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem()
		statusBarItemEl.setText('Status Bar Text')

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, _view: MarkdownView | MarkdownFileInfo) => {
				console.log(editor.getSelection())
				editor.replaceSelection('Sample Editor Command')
			},
		})

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new EmailPluginSettingTab(this.app, this))

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt)
		})

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000))

		// Connect to the notification API
		this.connectToNotificationApi()
	}

	override onunload() {
		// Close the notification connection if it exists
		if (this.eventSource) {
			this.eventSource.close()
			this.eventSource = null
		}
	}

	private connectToNotificationApi() {
		try {
			// Create a new EventSource connection to the /notify endpoint
			// This custom implementation supports authorization headers
			const url = new URL('/notify', this.settings.serviceUrl).toString()

			this.eventSource = new SSE(url, {
				headers: {
					Authorization: `Bearer ${this.settings.serviceApiKey}`,
					Accept: 'text/event-stream',
					'Cache-Control': 'no-cache',
				},
			})

			// Handle connection established
			this.eventSource.addEventListener('connected', (event: MessageEvent) => {
				console.log('Connected to notification API:', event.data)
				new Notice('Connected to email notification service')
			})

			// Handle heartbeat to keep connection alive
			this.eventSource.addEventListener('heartbeat', (event: MessageEvent) => {
				console.log('Notification heartbeat:', event.data)
			})

			// Handle new email notifications
			this.eventSource.addEventListener('new-email', (event: MessageEvent) => {
				const data = JSON.parse(event.data)
				console.log('New email notification received:', data)
				new Notice(`New email received! ID: ${data.emailId}`)
				// Here you can add code to fetch the email details and process it
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
