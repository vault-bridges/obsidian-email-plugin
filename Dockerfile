FROM node:22.14.0-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 25

VOLUME /app/certs
VOLUME /app/db

CMD ["node", "./api/email-injest-service.ts"]
