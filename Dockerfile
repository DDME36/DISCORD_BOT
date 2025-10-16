FROM node:22-alpine

WORKDIR /app

# Install yt-dlp and ffmpeg
RUN apk add --no-cache ffmpeg python3 py3-pip && \
    pip3 install --break-system-packages yt-dlp

# Copy package files
COPY package*.json ./

# Remove old lock file and install fresh
RUN rm -f package-lock.json && npm install --legacy-peer-deps

# Copy source code
COPY . .

# Start bot
CMD ["node", "index.js"]
