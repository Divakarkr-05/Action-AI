"""
REALITY → ACTION AI – Supabase Client (Server-Side)

Uses the SERVICE_ROLE key for privileged database operations.
This key MUST NEVER be exposed to the frontend.
"""

from __future__ import annotations

import logging
from typing import Optional

from supabase import create_client, Client

from app.config.settings import get_settings

logger = logging.getLogger(__name__)

_supabase_client: Optional[Client] = None
_last_url: Optional[str] = None
_last_key: Optional[str] = None


def get_supabase_client() -> Optional[Client]:
    """
    Returns a Supabase client configured with the service-role key.
    Returns None if Supabase is not configured (URL/key missing).
    """
    global _supabase_client, _last_url, _last_key
    settings = get_settings()

    url = (settings.supabase_url or "").strip()
    key = (settings.supabase_service_role_key or "").strip()

    if not url or not key:
        return None

    # Check if key is mistakenly the publishable/anon key
    if key.startswith("sb_publishable_"):
        logger.warning(
            "SUPABASE MISCONFIGURATION: SUPABASE_SERVICE_ROLE_KEY is configured with an 'anon/publishable' "
            "key (starts with 'sb_publishable_'). The server requires the 'service_role/secret' key "
            "(starts with 'sb_secret_') to perform database operations with Row Level Security (RLS) enabled. "
            "Requests may fail with 42501 permission denied."
        )

    if _supabase_client is None or _last_url != url or _last_key != key:
        _last_url = url
        _last_key = key
        _supabase_client = create_client(url, key)

    return _supabase_client
