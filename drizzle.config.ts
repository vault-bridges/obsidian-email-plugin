import { defineConfig } from 'drizzle-kit'

export default defineConfig({
	out: './drizzle',
	schema: './api/schema.ts',
	dialect: 'sqlite',
	dbCredentials: {
		url: process.env.DB_FILE_NAME || './emails.db',
	},
})
