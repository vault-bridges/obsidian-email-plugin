FROM node:23.6.0-slim

VOLUME /app/certs

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN mkdir -p /app/certs

EXPOSE 25

CMD ["node", "./api/email-injest-service.ts"]
