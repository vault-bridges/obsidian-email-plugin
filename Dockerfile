FROM node:22.16.0-slim

WORKDIR /app
ENV NODE_ENV=production

# Install pnpm
RUN corepack enable

# Copy package files
COPY pnpm-lock.yaml pnpm-workspace.yaml .pnpmrc ./
RUN pnpm install --prod --frozen-lockfile

COPY . .

EXPOSE 25

VOLUME /app/certs
VOLUME /app/db

CMD ["node", "--experimental-strip-types", "./api/index.ts"]
