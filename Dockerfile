# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY data/ ./data/
RUN npm run build
RUN npm run ingest:nist-80053
RUN npm run ingest:nist-80082
RUN npm run ingest:mitre
RUN npm run ingest:mappings
RUN npm run populate:metadata

FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data/
RUN chown -R nodejs:nodejs /app
USER nodejs
ENV NODE_ENV=production
ENV OT_MCP_DB_PATH=/app/data/ot-security.db
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + process.env.PORT + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
CMD ["node", "dist/http-server.js"]
