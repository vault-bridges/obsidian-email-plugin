# Obsidian Email Plugin Tests

This directory contains end-to-end tests for the Obsidian Email Plugin. The tests verify the behavior from client to server with minimal mocking (only the Obsidian API is mocked).

## Test Structure

The tests are organized as follows:

- `e2e/setup.ts`: Common setup for all tests, including environment variables, mocking Obsidian API, and starting the email service.
- `e2e/online-mode.test.ts`: Tests the scenario where the plugin is loaded first, then an email is received.
- `e2e/offline-mode.test.ts`: Tests the scenario where an email is received first, then the plugin is loaded.

## Running the Tests

To run the tests, use the following commands:

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run only end-to-end tests
npm run test:e2e

# Run end-to-end tests in watch mode
npm run test:e2e:watch
```

## Test Cases

### Online Mode Test

This test verifies that when the plugin is already loaded and an email is received, the plugin displays a notification.

1. Initialize the email plugin
2. Send an email with curl
3. Check that the Notice object is called with the expected string

### Offline Mode Test

This test verifies that when the plugin is loaded after an email has been received, the plugin displays a notification for the previously received email.

1. Send an email with curl
2. Initialize the email plugin
3. Check that the Notice object is called with the expected string

## Requirements

- Node.js 18+
- OpenSSL (for generating self-signed certificates)
- curl (for sending test emails)
