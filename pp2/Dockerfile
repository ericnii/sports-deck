# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

# Copy built assets and necessary files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
ENV NODE_ENV=production

# Install all deps (prisma CLI needed for migrate at startup), generate client
RUN npm install && npx prisma generate

# Expose the port
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]