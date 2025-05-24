import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		environment: 'node',
		include: ['tests/e2e/**/*.test.ts'],
		testTimeout: 30000, // Longer timeout for E2E tests
		fileParallelism: false,
	},
})
