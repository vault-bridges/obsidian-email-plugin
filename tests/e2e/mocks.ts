import { vi } from 'vitest'
import type { Plugin } from 'obsidian'

// Mock Notice function for testing
export const mockNotice = vi.fn()
export const mockCreate = vi.fn().mockImplementation((path) => ({ path }))
export const mockLayoutReady = vi.fn().mockImplementation((callback) => callback())

// Mock obsidian module
vi.mock('obsidian', () => ({
	App: vi.fn(),
	Notice: mockNotice,
	Plugin: vi.fn().mockImplementation(function (this: Plugin) {
		this.app = {
			// @ts-expect-error
			workspace: {
				onLayoutReady: mockLayoutReady,
			},
			// @ts-expect-error
			vault: {
				createFolder: vi.fn().mockResolvedValue(undefined),
				create: mockCreate,
				append: vi.fn().mockResolvedValue(undefined),
				createBinary: vi.fn().mockResolvedValue(undefined),
				getFileByPath: vi.fn().mockReturnValue(null),
				getFolderByPath: vi.fn().mockReturnValue(null),
			},
			internalPlugins: {},
		}
		this.registerEvent = vi.fn()
		this.addRibbonIcon = vi.fn()
		this.addCommand = vi.fn()
		this.addSettingTab = vi.fn()
		this.loadData = vi.fn().mockResolvedValue({
			serviceUrl: 'http://localhost:3001',
			serviceApiKey: 'test-token',
		})
		this.saveData = vi.fn().mockResolvedValue(undefined)
	}),
	PluginSettingTab: vi.fn(),
	Setting: vi.fn().mockImplementation(() => ({
		setName: vi.fn().mockReturnThis(),
		setDesc: vi.fn().mockReturnThis(),
		addText: vi.fn().mockImplementation(() => ({
			setPlaceholder: vi.fn().mockReturnThis(),
			setValue: vi.fn().mockReturnThis(),
			onChange: vi.fn().mockReturnThis(),
		})),
	})),
}))
