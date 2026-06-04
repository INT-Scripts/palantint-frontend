# Stage 1: Development
FROM node:krypton-alpine AS development

WORKDIR /app

COPY package*.json ./

# Dev install including devDependencies
RUN npm install

COPY . .

EXPOSE 80

# Next.js development server running on port 80
CMD ["npm", "run", "dev", "--", "-p", "80"]


# Stage 2: Builder (Production asset compiler)
FROM node:krypton-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Install all dependencies including devDependencies (needed for next build)
RUN npm ci

COPY . .

# Build the Next.js server app
RUN npm run build


# Stage 3: Production (Minimal runner)
FROM node:krypton-alpine AS production

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 80

CMD ["npm", "run", "start", "--", "-p", "80"]
