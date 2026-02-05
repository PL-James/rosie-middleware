# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/frontend/package*.json ./packages/frontend/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build backend and frontend
RUN npm run backend:build
RUN npm run frontend:build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/

# Install production dependencies only
RUN npm ci --production --workspace=backend

# Copy built artifacts
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/backend/drizzle ./packages/backend/drizzle
COPY --from=builder /app/packages/backend/src/db/migrate.js ./packages/backend/src/db/migrate.js
COPY --from=builder /app/packages/frontend/dist ./packages/frontend/dist

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "run", "backend:start"]
