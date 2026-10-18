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

    @property
    def _client(self) -> Optional[Any]:
        return get_supabase_client()

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
        image_authenticity: Optional[str] = None,
        ai_generated_probability: Optional[float] = None,
        authenticity_confidence: Optional[float] = None,
        authenticity_model: Optional[str] = None,
        authenticity_indicators: Optional[List[str]] = None,
        safety_category: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Persist a successful analysis result to the database.
        Returns the inserted record or None if Supabase is not configured.
        """
        if not self.is_available:
            logger.warning("Supabase not configured — skipping history save")
            return None

        base_payload = {
            "user_id": user_id,
            "question": question,
            "what_i_see": what_i_see,
            "what_is_happening": what_is_happening,
            "next_action": next_action,
            "steps": steps,
            "confidence": confidence,
            "safety_warning": safety_warning,
            "image_url": image_url,
        }
        full_payload = dict(base_payload)
        if image_authenticity is not None:
            full_payload["image_authenticity"] = image_authenticity
        if ai_generated_probability is not None:
            full_payload["ai_generated_probability"] = ai_generated_probability
        if authenticity_confidence is not None:
            full_payload["authenticity_confidence"] = authenticity_confidence
        if authenticity_model is not None:
            full_payload["authenticity_model"] = authenticity_model
        if authenticity_indicators is not None:
            full_payload["authenticity_indicators"] = authenticity_indicators
        if safety_category is not None:
            full_payload["safety_category"] = safety_category

        try:
            logger.info("Supabase INSERT initiating for user_id=%s", user_id)
            try:
                result = (
                    self._client.table("analysis_history")
                    .insert(full_payload)
                    .execute()
                )
            except Exception as insert_err:
                err_str = str(insert_err)
                if any(
                    col in err_str
                    for col in ("image_authenticity", "ai_generated_probability", "authenticity_", "safety_category")
                ):
                    logger.warning(
                        "Supabase analysis_history table does not yet have all extended columns. "
                        "Retrying with base payload."
                    )
                    result = (
                        self._client.table("analysis_history")
                        .insert(base_payload)
                        .execute()
                    )
                else:
                    raise insert_err

            inserted_id = result.data[0].get("id") if result.data else None
            logger.info("Supabase INSERT completed: row_id=%s", inserted_id)
            return result.data[0] if result.data else None
        except Exception as exc:
            logger.error("Failed to save analysis to history: %s", exc)
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
            logger.info("Supabase SELECT initiating for user_id=%s (limit=%d, offset=%d)", user_id, limit, offset)
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
            count = len(result.data) if result.data else 0
            logger.info("Supabase SELECT completed: retrieved %d rows for user_id=%s", count, user_id)
            return result.data or []
        except Exception as exc:
            logger.error("Failed to fetch user history: %s", exc)
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
