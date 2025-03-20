FROM node:22.14.0-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json .npmrc ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 25

VOLUME /app/certs
VOLUME /app/db

CMD ["node", "--experimental-strip-types", "./api/email-injest-service.ts"]
