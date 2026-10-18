# ─────────────────────────────────────────────────────────────
# REALITY → ACTION AI — Frontend Multi-Stage Dockerfile
# Stage 1: Build production React + Vite application
# Stage 2: Serve optimized assets with Nginx
# ─────────────────────────────────────────────────────────────

# ── Stage 1: Builder ──────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json ./

# Install exact dependencies
RUN npm ci

# Public build-time arguments (NEVER pass backend secrets here)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_GRAPHQL_URL=http://localhost:8001/graphql

# Expose build args to Vite build environment
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_GRAPHQL_URL=$VITE_GRAPHQL_URL \
    NODE_ENV=production

# Copy application source and public assets (including public/models/detectra.onnx)
COPY . .

# Run production build (TypeScript check + Vite bundler)
RUN npm run build

# ── Stage 2: Production Server ────────────────────────────────
FROM nginx:alpine AS runner

# Remove default nginx HTML files
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Health check to ensure nginx is serving index.html
HEALTHCHECK --interval=20s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
