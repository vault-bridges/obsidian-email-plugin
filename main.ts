import {
	App,
	Editor,
	type MarkdownFileInfo,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from 'obsidian'

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
	}

	override onunload() {}

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
