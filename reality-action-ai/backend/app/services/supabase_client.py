"""
REALITY → ACTION AI – Supabase Client (Server-Side)

Uses the SERVICE_ROLE key for privileged database operations.
This key MUST NEVER be exposed to the frontend.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Optional

from supabase import create_client, Client

from app.config.settings import get_settings


@lru_cache
def get_supabase_client() -> Optional[Client]:
    """
    Returns a Supabase client configured with the service-role key.
    Returns None if Supabase is not configured (URL/key missing).
    """
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None

    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )
