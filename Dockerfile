FROM node:22.16.0-slim

WORKDIR /app
ENV NODE_ENV=production

# Install pnpm
RUN corepack enable

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .pnpmrc ./

# Configure pnpm to use hoisted dependencies
RUN pnpm config set node-linker hoisted

# Install dependencies
RUN pnpm install --prod --frozen-lockfile

COPY . .

EXPOSE 25

VOLUME /app/certs
VOLUME /app/db

CMD ["node", "--experimental-strip-types", "./api/index.ts"]
