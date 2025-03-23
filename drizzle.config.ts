import { defineConfig } from 'drizzle-kit'

export default defineConfig({
	out: './drizzle',
	schema: './api/schema.ts',
	dialect: 'sqlite',
	casing: 'snake_case',
	dbCredentials: {
		url: process.env.DB_FILE_NAME || './emails.db',
	},
})
