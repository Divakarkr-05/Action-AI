"""
REALITY → ACTION AI – Temporary Session Manager

Enforces:
1. Temporary session TTL = 30 minutes (1800 seconds).
2. Strict cross-user temporary-session isolation (no shared fallback).
3. Explicit session purge for "Clear Conversation / New Private Session".
4. Transient memory only – never persisted to Supabase database.
"""

from __future__ import annotations

import time
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

SESSION_TTL_SECONDS = 1800  # 30 minutes


class SessionRecord:
    def __init__(self, session_id: str, data: Dict[str, Any]) -> None:
        self.session_id = session_id
        self.data = data
        self.created_at = time.time()
        self.last_accessed_at = self.created_at

    def is_expired(self, ttl: float = SESSION_TTL_SECONDS) -> bool:
        return (time.time() - self.last_accessed_at) > ttl

    def touch(self) -> None:
        self.last_accessed_at = time.time()


class SessionManager:
    """Manages temporary analysis sessions with strict TTL and isolation."""

    def __init__(self, ttl_seconds: int = SESSION_TTL_SECONDS) -> None:
        self._ttl = ttl_seconds
        self._sessions: Dict[str, SessionRecord] = {}

    def _evict_expired(self) -> None:
        """Remove any sessions that have exceeded the 30-minute TTL."""
        now = time.time()
        expired_ids = [
            sid for sid, rec in self._sessions.items()
            if (now - rec.last_accessed_at) > self._ttl
        ]
        for sid in expired_ids:
            del self._sessions[sid]
            logger.debug("Evicted expired temporary session: %s", sid)

    def set_session(self, session_id: str, data: Dict[str, Any]) -> None:
        """Store or update a temporary session."""
        if not session_id:
            return
        self._evict_expired()
        rec = SessionRecord(session_id, data)
        self._sessions[session_id] = rec

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a temporary session.
        Returns None if not found or expired.
        Guarantees STRICT isolation: never falls back to another session.
        """
        if not session_id:
            return None
        self._evict_expired()
        rec = self._sessions.get(session_id)
        if not rec:
            return None
        if rec.is_expired(self._ttl):
            del self._sessions[session_id]
            return None
        rec.touch()
        return rec.data

    def clear_session(self, session_id: str) -> bool:
        """Explicitly purge a session for 'Clear Conversation / New Private Session'."""
        if not session_id:
            return False
        if session_id in self._sessions:
            del self._sessions[session_id]
            logger.info("Cleared private temporary session: %s", session_id)
            return True
        return False

    @property
    def active_session_count(self) -> int:
        self._evict_expired()
        return len(self._sessions)


_session_manager: Optional[SessionManager] = None


def get_session_manager() -> SessionManager:
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager()
    return _session_manager
