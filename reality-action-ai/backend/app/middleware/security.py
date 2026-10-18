"""
REALITY → ACTION AI – Security & Rate Limiting Middleware

Implements:
1. GraphQL Depth Limiting (Max depth = 8 levels).
2. Per-client / Per-user Rate Limiting (Sliding window token bucket).
3. HTTP Security Headers & Content Security Policy (CSP).
"""

from __future__ import annotations

import time
import logging
from collections import defaultdict
from typing import Callable, Dict, List

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from graphql.error import GraphQLError
from graphql.validation import ValidationRule

logger = logging.getLogger(__name__)

# ── 1. GraphQL Depth Validation Rule ─────────────────────────────────────────

MAX_GRAPHQL_DEPTH = 8


class MaxDepthValidationRule(ValidationRule):
    """Rejects queries exceeding the configured maximum AST depth."""

    def enter_operation_definition(self, node, key, parent, path, ancestors):
        depth = self._calculate_depth(node.selection_set)
        if depth > MAX_GRAPHQL_DEPTH:
            self.report_error(
                GraphQLError(
                    f"GraphQL query depth of {depth} exceeds the maximum allowed depth of {MAX_GRAPHQL_DEPTH}.",
                    nodes=[node],
                )
            )

    def _calculate_depth(self, selection_set, current_depth: int = 1) -> int:
        if not selection_set or not selection_set.selections:
            return current_depth
        max_sub = current_depth
        for sel in selection_set.selections:
            # Fragment spreads or nested selection sets
            if hasattr(sel, "selection_set") and sel.selection_set:
                sub = self._calculate_depth(sel.selection_set, current_depth + 1)
                if sub > max_sub:
                    max_sub = sub
        return max_sub


# ── 2. Security Headers Middleware ───────────────────────────────────────────

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Injects robust HTTP security headers into every response."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # Content-Security-Policy (Restricted to self + trusted endpoints)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "img-src 'self' data: blob:; "
            "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "connect-src 'self' http://localhost:* ws://localhost:* https://*.supabase.co; "
            "frame-ancestors 'none';"
        )
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(self), microphone=(), geolocation=()"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"

        return response


# ── 3. Per-Client Rate Limiting Middleware ────────────────────────────────────

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    In-memory rate limiter per client IP or authenticated bearer token.
    Allows up to 120 requests per minute by default.
    """

    def __init__(self, app, max_requests: int = 120, window_seconds: int = 60) -> None:
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        # Client identifier -> list of request timestamps
        self.request_history: Dict[str, List[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Don't rate limit health checks
        if request.url.path in ("/health", "/docs", "/openapi.json"):
            return await call_next(request)

        # Identify client by Authorization token if present, else by client IP
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            client_id = auth_header.split(" ")[1][:32]
        else:
            client_id = request.client.host if request.client else "unknown"

        now = time.time()
        window_start = now - self.window_seconds

        # Prune old timestamps
        history = [ts for ts in self.request_history[client_id] if ts > window_start]
        self.request_history[client_id] = history

        if len(history) >= self.max_requests:
            retry_after = int(self.window_seconds - (now - history[0])) + 1
            logger.warning("Rate limit exceeded for client_id=%s (%d requests in %ds)", client_id, len(history), self.window_seconds)
            return JSONResponse(
                status_code=429,
                content={
                    "errors": [
                        {
                            "message": "Rate limit exceeded. Too many requests. Please try again later.",
                            "extensions": {"code": "RATE_LIMITED", "retry_after_seconds": retry_after},
                        }
                    ]
                },
                headers={"Retry-After": str(retry_after)},
            )

        self.request_history[client_id].append(now)
        return await call_next(request)
