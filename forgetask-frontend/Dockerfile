# Multi-stage build for the Next.js frontend (forgetask-frontend)
# Builds with `next build` and serves with `next start`.

FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci


FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build


FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Install only production deps for runtime.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Runtime assets.
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./next.config.ts

# Next.js default port (matches the project README).
EXPOSE 3000

CMD ["npm", "run", "start"]
