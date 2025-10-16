FROM node:22-alpine

WORKDIR /app

# Install ffmpeg
RUN apk add --no-cache ffmpeg python3 make g++

# Copy package files
COPY package*.json ./

# Remove old lock file and install fresh
RUN rm -f package-lock.json && npm install --legacy-peer-deps

# Copy source code
COPY . .

# Start bot
CMD ["node", "index.js"]
