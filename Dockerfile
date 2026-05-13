# ═══════════════════════════════════════════════════════════════════════════
# OT SECURITY MCP SERVER DOCKERFILE
# ═══════════════════════════════════════════════════════════════════════════

FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts && npm rebuild

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# ───────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS production

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm rebuild

RUN apk del python3 make g++

COPY --from=builder /app/dist ./dist
COPY data ./data

RUN addgroup -S nodejs && adduser -S nodejs -G nodejs \
    && chown -R nodejs:nodejs /app/data
USER nodejs

ENV NODE_ENV=production
ENV OT_MCP_DB_PATH=/app/data/ot-security.db

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=10 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/health || exit 1

CMD ["node", "dist/http-server.js"]
