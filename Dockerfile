# ---- Build Stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package definition files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci || npm install

# Copy source files
COPY . .

# Build frontend and bundle backend into dist/
RUN npm run build

# ---- Production Stage ----
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy built distribution assets from builder stage
COPY --from=builder /app/dist ./dist

# Use non-root node user
USER node

# Expose port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/config || exit 1

# Launch server
CMD ["node", "dist/server.cjs"]
