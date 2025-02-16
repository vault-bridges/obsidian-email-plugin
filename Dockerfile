FROM node:23.6.0-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 25

VOLUME /app/certs
VOLUME /app/db

CMD ["node", "./api/email-injest-service.ts"]
