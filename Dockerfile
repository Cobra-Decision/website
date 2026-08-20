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

# Install production dependencies only for smaller memory footprint and disk size
COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile

# Copy source and built assets from builder
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Create uploads, logs, backups, and data directories
RUN mkdir -p /app/public/uploads /app/log /app/data /app/backups
VOLUME ["/app/public/uploads", "/app/log", "/app/data", "/app/backups"]

EXPOSE 3000

# Start server
CMD ["bun", "src/index.tsx"]
