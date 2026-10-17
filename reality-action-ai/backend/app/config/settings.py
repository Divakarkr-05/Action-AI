"""
REALITY → ACTION AI – Application Configuration
"""

from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Server ─────────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000

    # ── CORS ───────────────────────────────────────────────────
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # ── Hugging Face / AI ──────────────────────────────────────
    hf_token: str = ""
    hf_model: str = "google/gemma-4-31B-it"
    ai_mode: str = "mock"          # "mock" | "gemma" | "sarvam"

    # ── Sarvam AI ──────────────────────────────────────────────
    sarvam_api_key: str = ""
    sarvam_model: str = "gemma4"
    sarvam_base_url: str = "https://api.sarvam.ai/v2"

    # ── Supabase ──────────────────────────────────────────────
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # ── File Upload ────────────────────────────────────────────
    max_upload_size_mb: int = 10

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
