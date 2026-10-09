FROM node:24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run db:generate && npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/next.config.ts ./next.config.ts
COPY --from=builder --chown=node:node /app/prisma ./prisma
USER node
EXPOSE 3000
CMD ["./node_modules/.bin/next", "start", "--hostname", "0.0.0.0"]
