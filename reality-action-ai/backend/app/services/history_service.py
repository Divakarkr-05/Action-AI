"""
REALITY → ACTION AI – History Service

Manages analysis history persistence via Supabase.
All operations require a valid user_id derived from authenticated sessions.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

from app.services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


class HistoryService:
    """Server-side analysis history CRUD operations."""

    def __init__(self) -> None:
        self._client = get_supabase_client()

    @property
    def is_available(self) -> bool:
        return self._client is not None

    async def save_analysis(
        self,
        user_id: str,
        question: Optional[str],
        what_i_see: str,
        what_is_happening: str,
        next_action: str,
        steps: List[str],
        confidence: float,
        safety_warning: Optional[str] = None,
        image_url: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Persist a successful analysis result to the database.
        Returns the inserted record or None if Supabase is not configured.
        """
        if not self.is_available:
            logger.warning("Supabase not configured — skipping history save")
            return None

        try:
            result = (
                self._client.table("analysis_history")
                .insert({
                    "user_id": user_id,
                    "question": question,
                    "what_i_see": what_i_see,
                    "what_is_happening": what_is_happening,
                    "next_action": next_action,
                    "steps": steps,
                    "confidence": confidence,
                    "safety_warning": safety_warning,
                    "image_url": image_url,
                })
                .execute()
            )
            return result.data[0] if result.data else None
        except Exception:
            logger.exception("Failed to save analysis to history")
            return None

    async def get_user_history(
        self,
        user_id: str,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Fetch analysis history for a specific user.
        Optionally filter by a search term across question/what_i_see/what_is_happening.
        """
        if not self.is_available:
            return []

        try:
            query = (
                self._client.table("analysis_history")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(limit)
                .offset(offset)
            )

            if search and search.strip():
                # Use ilike for simple search across multiple columns
                search_term = f"%{search.strip()}%"
                query = query.or_(
                    f"question.ilike.{search_term},"
                    f"what_i_see.ilike.{search_term},"
                    f"what_is_happening.ilike.{search_term}"
                )

            result = query.execute()
            return result.data or []
        except Exception:
            logger.exception("Failed to fetch user history")
            return []

    async def get_analysis_by_id(
        self,
        user_id: str,
        analysis_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch a single analysis by ID, scoped to the user.
        """
        if not self.is_available:
            return None

        try:
            result = (
                self._client.table("analysis_history")
                .select("*")
                .eq("id", analysis_id)
                .eq("user_id", user_id)
                .single()
                .execute()
            )
            return result.data
        except Exception:
            logger.exception("Failed to fetch analysis by ID")
            return None

    async def delete_analysis(
        self,
        user_id: str,
        analysis_id: str,
    ) -> bool:
        """
        Delete a specific analysis record, scoped to the user.
        """
        if not self.is_available:
            return False

        try:
            self._client.table("analysis_history") \
                .delete() \
                .eq("id", analysis_id) \
                .eq("user_id", user_id) \
                .execute()
            return True
        except Exception:
            logger.exception("Failed to delete analysis")
            return False


# ── Singleton factory ──────────────────────────────────────────

_history_service: Optional[HistoryService] = None


def get_history_service() -> HistoryService:
    global _history_service
    if _history_service is None:
        _history_service = HistoryService()
    return _history_service
