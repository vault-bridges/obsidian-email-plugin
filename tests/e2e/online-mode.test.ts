// Import mocks first to ensure they're set up before any other imports
import { mockNotice } from './mocks.ts'

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import EmailPlugin from '../../main.ts'

// Import setup to ensure it runs before tests
import './setup'

const execPromise = promisify(exec)

describe('Online Mode - Plugin First, Then Email', () => {
	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks()
	})

	it('should display a notice when an email is received after plugin is loaded', async () => {
		// 1. Initialize the plugin first
		// @ts-expect-error - Mocking the App object
		const plugin = new EmailPlugin()
		await plugin.onload()

		// Set plugin settings
		plugin.settings = {
			serviceUrl: 'http://localhost:3001',
			serviceApiKey: 'test-token',
			emailSavePath: 'Emails',
			lastEmailFetchTimestamp: 0,
		}

		// 2. Send an email using curl
		const emailContent = `From: sender@example.com
To: recipient@test.com
Subject: Test Online Mode
Date: ${new Date().toUTCString()}
Content-Type: text/plain
Message-ID: <test-${Date.now()}-${Math.random().toString(36).substring(2, 15)}@test.com>

This is a test email for online mode testing.`

		fs.writeFileSync('./test-email.eml', emailContent)

		await execPromise(
			`curl --url smtp://localhost:2525 --mail-from sender@example.com --mail-rcpt recipient@test.com --upload-file ./test-email.eml --noproxy localhost`,
		)

		// 4. Verify that Notice was called with the expected message
		expect(mockNotice).toHaveBeenCalledWith(expect.stringMatching(/New email received! ID: \d+/))

		// Clean up
		fs.unlinkSync('./test-email.eml')
	})
})
