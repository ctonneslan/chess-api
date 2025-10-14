# syntax=docker/dockerfile:1
FROM node:20-slim

# Set working directory
WORKDIR /usr/src/app

# Copy package files first (for better build caching)
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy the rest of the source
COPY . .

# Expose app port
EXPOSE 3000

# Start the server
CMD ["node", "src/server.js"]
