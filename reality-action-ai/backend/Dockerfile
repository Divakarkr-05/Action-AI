# ─────────────────────────────────────────────────────────────
# REALITY → ACTION AI — Backend Dockerfile
# Production-grade, non-root container for FastAPI + GraphQL
# ─────────────────────────────────────────────────────────────

FROM python:3.12-slim AS runtime

# Environment optimization
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    HOST=0.0.0.0

WORKDIR /app

# Install minimal OS dependencies for health check and runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create dedicated non-root application user
RUN groupadd -r appuser && useradd -r -g appuser -u 1000 -d /app appuser

# Install Python dependencies first for caching efficiency
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code and knowledge data
COPY app/ ./app/
COPY tests/ ./tests/

# Set correct ownership for non-root execution
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose internal service port
EXPOSE 8000

# Health check using actual FastAPI health check route
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Production server command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
