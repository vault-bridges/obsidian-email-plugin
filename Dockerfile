# Base image
FROM node:22.16.0-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production

# Setup pnpm
RUN corepack enable
RUN pnpm config set node-linker hoisted

# Copy dependency files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .pnpmrc ./
COPY patches ./patches

# Install dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy application code
COPY . .

# Configure networking
EXPOSE 25

# Define persistent storage
VOLUME ["/app/certs", "/app/db"]

# Set entrypoint and command
ENTRYPOINT ["node", "--experimental-strip-types"]
CMD ["./api/index.ts"]
