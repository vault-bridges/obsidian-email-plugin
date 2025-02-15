FROM node:23.6.0-slim

VOLUME /app/certs

ARG SMTP_PORT
ARG SMTP_HOST
ARG SMTP_DOMAIN

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN mkdir -p /app/certs

EXPOSE 25

CMD ["node", "./api/email-injest-service.ts"]
