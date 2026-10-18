"""
REALITY → ACTION AI – FastAPI Application Entry Point

Endpoints:
  GET  /health    – REST health check
  POST /graphql   – Strawberry GraphQL (mutations + queries)
  GET  /graphql   – GraphiQL playground (development)
"""

from __future__ import annotations

import strawberry
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter

from app.config.settings import get_settings
from app.graphql.mutations import Mutation
from app.graphql.queries import Query
from app.middleware.security import (
    MaxDepthValidationRule,
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
)
from strawberry.extensions import AddValidationRules

# ── Application factory ───────────────────────────────────────

def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="REALITY → ACTION AI",
        description="Multimodal AI backend powered by Gemma 4.",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # ── Security & Headers Middleware ──────────────────────────
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RateLimitMiddleware, max_requests=120, window_seconds=60)

    # ── CORS ───────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    # ── GraphQL (with AST Depth Limit validation) ───────────────
    gql_schema = strawberry.Schema(
        query=Query,
        mutation=Mutation,
        extensions=[AddValidationRules([MaxDepthValidationRule])],
    )
    graphql_app = GraphQLRouter(
        gql_schema,
        graphql_ide="graphiql",   # set to None in production
    )
    app.include_router(graphql_app, prefix="/graphql")

    # ── REST health check ──────────────────────────────────────
    @app.get("/health", tags=["Health"])
    async def health() -> dict:
        active_model = settings.sarvam_model if settings.ai_mode.strip().lower() == "sarvam" else settings.hf_model
        return {
            "status": "ok",
            "service": "reality-action-ai",
            "version": "0.1.0",
            "ai_mode": settings.ai_mode,
            "model": active_model,
        }

    return app


app = create_app()
