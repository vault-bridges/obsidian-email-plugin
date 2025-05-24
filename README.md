# Obsidian Email Plugin

This plugin allows you to receive emails directly in your Obsidian vault. It consists of two parts:
1. An Obsidian plugin that creates notes from emails
2. An API service that receives emails via SMTP and makes them available to the plugin

## Features

- Receive emails as Obsidian notes
- Automatically save email attachments
- Real-time notifications for new emails
- Configure where emails are saved in your vault

## How to Use the Plugin

### Installation

## Installation

> [!NOTE]
> This plugin is currently in its **alpha** state, and I welcome feedback to enhance its functionality and stability.

1. Before installing, ensure you have the [BRAT Obsidian plugin](https://tfthacker.com/BRAT) installed and running.

2. Then follow [the BRAT instructions](https://tfthacker.com/brat-quick-guide#Adding+a+beta+plugin).
3. When prompted, use `vault-bridges/obsidian-email-plugin` as the plugin name to add it to your Obsidian setup.

### Configuration

1. Go to Settings > Community plugins > Email Plugin.
2. Configure the following settings:
   - **Service URL**: The URL of your email API service (e.g., `https://your-email-api.example.com`)
   - **Service API Key**: The authentication key for your email service
   - **Email Save Path**: The folder path where emails will be saved in your vault (e.g., `emails`)

### Using the Plugin

Once configured, the plugin will:
1. Connect to the email service and listen for new emails
2. Create a new note for each email received
3. Save any attachments to the specified folder
4. Show notifications when new emails arrive

Each email note will contain:
- The email content (HTML or text)
- Links to any attachments

## Setting Up the API Service

The API service is a Node.js application that:
1. Runs an SMTP server to receive emails
2. Stores emails in a database
3. Provides an API for the Obsidian plugin to fetch emails

### Prerequisites

- Node.js v16 or higher
- SSL certificates for secure SMTP (key.pem and cert.pem)
- A domain name for receiving emails

### Installation

1. Clone the repository
2. Provide env variables from the next section
3. Install dependencies with `pnpm install`

### Configuration

The API service is configured using environment variables:

#### API Configuration
- `API_HOST`: Host to bind the API server (default: localhost)
- `API_PORT`: Port for the API server (default: 80)
- `API_TOKEN`: Authentication token for API requests

#### SMTP Configuration
- `SMTP_HOST`: Host to bind the SMTP server (default: localhost)
- `SMTP_PORT`: Port for the SMTP server (default: 25)
- `SMTP_SECURE`: Whether to use SSL/TLS (true/false)
- `SMTP_PROXY`: Whether to use proxy protocol (true/false)
- `SMTP_KEY`: Path to SSL key file (default: key.pem)
- `SMTP_CERT`: Path to SSL certificate file (default: cert.pem)
- `SMTP_DOMAIN`: Domain name for receiving emails (default: localhost)

#### Database Configuration
- `DB_PATH`: Path to the database file (default: ./emails.db)

### Running the Service

Start the service with:

```bash
node api/index.ts
```

For production use, consider using a process manager like PM2:

```bash
pnpm install -g pm2
pm2 start api/index.ts --name email-api
```

## Development

### Plugin Development

If you want to contribute to the plugin or modify it for your own needs:

1. Clone the repository
2. Install dependencies with `pnpm install`
3. Run `pnpm run dev` to start the compilation in watch mode
4. Make changes to the TypeScript files
5. Reload Obsidian to test your changes

For convenience, you can clone the repository directly into your `.obsidian/plugins/obsidian-email-plugin` folder for easier testing.

### API Development

If you want to modify the API service:

1. Navigate to the `api` directory
2. Make your changes to the TypeScript files
3. Run `node --experimental-strip-types index.ts`
4. Restart the service to apply changes

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- The Obsidian team for creating an amazing knowledge management tool
- All contributors who have helped improve this plugin

## Support

If you need help with the plugin, please open an issue on GitHub or reach out through the Obsidian community forums.
