# Multi-stage Dockerfile for high-performance Bun runtime
FROM oven/bun:1.2-alpine AS builder

WORKDIR /app

# Install dependencies first for efficient caching
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source and build assets (Tailwind CSS generation)
COPY . .
RUN bun run build:css

# Production runtime stage
FROM oven/bun:1.2-alpine AS runner

WORKDIR /app

# Ensure production environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy node_modules and built assets from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lock ./bun.lock
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Create uploads, logs, and data directories
RUN mkdir -p /app/public/uploads /app/log
VOLUME ["/app/public/uploads", "/app/log"]

EXPOSE 3000

# Start server
CMD ["bun", "src/index.tsx"]
