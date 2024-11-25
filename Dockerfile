ARG NODE_VERSION=20.12.0

FROM node:${NODE_VERSION}-slim AS base

WORKDIR /app

# Set common environment variables
ENV NODE_ENV="production"
ENV PUPPETEER_CACHE_DIR=/app/.cache
ENV DISPLAY=:10
ENV PATH="/usr/bin:/app/selenium/driver:${PATH}"
ENV CHROME_BIN=/usr/bin/chromium
ENV CHROME_PATH=/usr/bin/chromium

# Build stage for both API and UI
FROM base AS build

RUN apt-get update -qq && \
    apt-get install -y build-essential pkg-config python-is-python3 xvfb

# Copy all source files first
COPY --link . .

# Install dependencies for root, API, and UI
RUN npm install --include=dev
RUN cd api && npm ci --include=dev
RUN cd ui && npm ci --include=dev

# Build both applications
RUN npm run build

# Prune dev dependencies
RUN cd api && npm prune --omit=dev
RUN cd ui && npm prune --omit=dev

# Patcher stage (for API requirements)
FROM build AS patcher
WORKDIR /app/api
RUN npm i --include=dev
RUN node ./patcher/scripts/patcher.js patch --packagePath /app/api/node_modules/puppeteer-core

# Final stage
FROM base
WORKDIR /app

# Install Chromium, Chromium Driver, and other dependencies
RUN apt-get update \
    && apt-get install -y wget gnupg nginx \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && apt-get update \
    && apt-get install chromium chromium-driver -y fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 xvfb curl unzip default-jre dbus dbus-x11 \
    --no-install-recommends

# Copy built applications from previous stages
COPY --from=patcher /app /app

# Copy and setup entrypoint
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expose ports for all services
EXPOSE 3000
EXPOSE 3001
EXPOSE 5173
EXPOSE 9223

# Environment variables
ENV HOST_IP=0.0.0.0
ENV DISPLAY=:10
ENV DBUS_SESSION_BUS_ADDRESS=autolaunch:

ENTRYPOINT ["/app/entrypoint.sh"]
