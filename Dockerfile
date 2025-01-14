# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install TypeScript globally
RUN npm install -g typescript

# First build frontend
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:client

# Then build server
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/tsconfig.json ./
COPY server/src ./src
RUN /usr/local/bin/tsc

# Create migrations directory (TypeScript will handle the compilation)
RUN mkdir -p dist/migrations

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy built assets and server files
COPY --from=builder /app/dist ./client/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/package.json ./package.json
COPY --from=builder /app/server/package-lock.json ./package-lock.json

# Install production dependencies only
RUN npm ci --only=production

# Create data directory for SQLite
RUN mkdir -p /app/data

# Environment variables that can be overridden
ENV PORT=3000 \
    STATIC_DIR=/app/client/dist

EXPOSE 3000

# Start the application
CMD ["node", "server/dist/index.js"] 