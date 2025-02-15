FROM node:23.6.0-slim

VOLUME /app/certs
VOLUME /app/db

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 25

CMD ["node", "./api/email-injest-service.ts"]
