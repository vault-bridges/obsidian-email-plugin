import process from 'process'
import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { exec, execSync } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import { EmailIngestService } from '../../api/email-injest-service.js'

// Import mocks first to ensure they're set up before any other imports
import './mocks'

const execPromise = promisify(exec)

const DB_PATH = './test-emails.db'

// Set up test environment variables
process.env.NODE_ENV = 'test'
process.env.API_HOST = 'localhost'
process.env.API_PORT = '3001'
process.env.API_TOKEN = 'test-token'
process.env.SMTP_HOST = 'localhost'
process.env.SMTP_PORT = '2525'
process.env.SMTP_DOMAIN = 'test.com'
process.env.SMTP_SECURE = 'false'
process.env.SMTP_PROXY = 'false'
process.env.DB_PATH = DB_PATH

// Generate self-signed certificates for SMTP
beforeAll(async () => {
	// Create a fresh test database
	if (fs.existsSync(DB_PATH)) {
		fs.unlinkSync(DB_PATH)
	}

	// Create directory for certificates
	if (!fs.existsSync('./certs')) {
		fs.mkdirSync('./certs')
	}

	// Generate self-signed certificate
	await execPromise(
		'openssl req -x509 -newkey rsa:2048 -keyout ./certs/key.pem -out ./certs/cert.pem -days 1 -nodes -subj "/CN=localhost"',
	)

	// Set certificate paths
	process.env.SMTP_KEY = path.resolve('./certs/key.pem')
	process.env.SMTP_CERT = path.resolve('./certs/cert.pem')

	// Start the email service
	const emailService = new EmailIngestService()
	emailService.start()

	// Wait for services to start
	await new Promise((resolve) => setTimeout(resolve, 1000))
})

// Clean up after all tests
afterAll(() => {
	// Clean up certificates
	if (fs.existsSync('./certs')) {
		fs.unlinkSync('./certs/key.pem')
		fs.unlinkSync('./certs/cert.pem')
		fs.rmdirSync('./certs')
	}

	// Clean up test database
	if (fs.existsSync(DB_PATH)) {
		fs.unlinkSync(DB_PATH)
	}
})

// Reset database before each test
beforeEach(async () => {
	// Reset mocks
	vi.clearAllMocks()

	console.log('Running database migrations...')
	const processOutput = execSync('npx drizzle-kit push --force')
	console.log(processOutput.toString())
})

// Clean up after each test
afterEach(() => {
	// Any per-test cleanup
})
