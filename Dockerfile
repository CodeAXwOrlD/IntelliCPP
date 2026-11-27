# ==============================================================================
# STAGE 1: Build Frontend (React + Monaco Editor)
# ==============================================================================
FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps

COPY frontend/ ./
RUN npm run build

# ==============================================================================
# STAGE 2: Production Server with Native Compilers & Sandbox
# ==============================================================================
FROM node:20-bookworm-slim

# Install C++20 toolchain (g++), Python 3, Rust, Make, CMake, and curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    g++ \
    python3 \
    rustc \
    cmake \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root metadata and datasets
COPY package*.json ./
COPY data/ ./data/

# Copy backend dependencies and install
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --legacy-peer-deps

# Copy backend sources and build native C++ N-API addon
COPY backend/ ./
RUN npx node-gyp rebuild

# Copy compiled frontend from Stage 1 into /app/frontend/build
WORKDIR /app
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Setup workspace and temporary execution sandbox directory
RUN mkdir -p /app/workspace /tmp/intellicpp-sandbox \
    && chmod 777 /tmp/intellicpp-sandbox

# Environment Configuration
ENV NODE_ENV=production \
    PORT=3001 \
    WORKSPACE_ROOT=/app/workspace

# Expose server port (Render / Railway dynamically binds via $PORT)
EXPOSE 3001

# Healthcheck probe (Kubernetes / Docker native)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Start the full-stack server
CMD ["node", "backend/server.js"]
