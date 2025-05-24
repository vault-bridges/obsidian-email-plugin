// Import mocks first to ensure they're set up before any other imports
import { mockCreate, mockLayoutReady, mockNotice } from './mocks.ts'

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import EmailPlugin from '../../main.ts'

// Import setup to ensure it runs before tests
import './setup'

const execPromise = promisify(exec)

describe('Offline Mode - Email First, Then Plugin', () => {
	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks()
	})

	it('should display a notice when plugin is loaded after email is received', async () => {
		// 1. Send an email using curl first
		const emailContent = `From: sender@example.com
To: recipient@test.com
Subject: Test Offline Mode
Date: ${new Date().toUTCString()}
Content-Type: text/plain
Message-ID: <test-${Date.now()}-${Math.random().toString(36).substring(2, 15)}@test.com>

This is a test email for offline mode testing.`

		fs.writeFileSync('./test-email.eml', emailContent)

		await execPromise(
			`curl --url smtp://localhost:2525 --mail-from sender@example.com --mail-rcpt recipient@test.com --upload-file ./test-email.eml --noproxy localhost`,
		)

		// 2. Initialize the plugin after the email is received
		// @ts-expect-error - Mocking the App object
		const plugin = new EmailPlugin()

		// Set plugin settings
		plugin.settings = {
			serviceUrl: 'http://localhost:3001',
			serviceApiKey: 'test-token',
			emailSavePath: 'Emails',
			lastEmailFetchTimestamp: 0,
		}

		// Load the plugin
		await plugin.onload()

		// Wait for layout to be ready
		const [onLayoutReadyMockResult] = vi.mocked(plugin.app.workspace.onLayoutReady).mock.results
		if (!onLayoutReadyMockResult) throw new Error('onLayoutReady not called')
		await onLayoutReadyMockResult.value

		// 3. Verify that Notice was called with the expected message
		expect(mockCreate).toHaveBeenCalledWith(
			'emails/Test Offline Mode.md',
			'This is a test email for offline mode testing.\n',
		)
		expect(mockNotice).toHaveBeenCalledWith(expect.stringMatching(/New email received! ID: \d+/))

		// Clean up
		fs.unlinkSync('./test-email.eml')
	})
})
