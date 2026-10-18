"""
REALITY → ACTION AI – Diagnostic Case Service

Manages persistence, lifecycle, 7-day TTL expiration, and user ownership
for closed-loop diagnostic cases.
Works with Supabase when configured, with PostgreSQL owning UUID generation
(gen_random_uuid()), and provides robust local in-memory storage for development,
tests, and offline mode.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.diagnostic.models import DiagnosticCase, is_valid_uuid
from app.services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


class DiagnosticCaseService:
    """Manages Diagnostic Case CRUD, ownership, and 7-day auto-expiration."""

    def __init__(self) -> None:
        # In-memory store: user_id -> Dict[case_id, DiagnosticCase]
        self._cases: Dict[str, Dict[str, DiagnosticCase]] = {}
        # Track which IDs have been persisted to DB
        self._persisted_ids: set[str] = set()

    @property
    def _client(self) -> Optional[Any]:
        return get_supabase_client()

    def _build_payload(self, case: DiagnosticCase, include_id: bool = False) -> Dict[str, Any]:
        """Serialize a DiagnosticCase into a Supabase-compatible payload dictionary."""
        payload: Dict[str, Any] = {
            "user_id": case.user_id,
            "session_id": case.session_id,
            "title": case.title,
            "domain": case.domain,
            "status": case.status,
            "current_state": case.current_state,
            "investigation_progress": case.investigation_progress,
            "image_quality": case.image_quality.model_dump() if case.image_quality else None,
            "evidence": [e.model_dump() for e in case.evidence],
            "fault_boxes": [f.model_dump() for f in case.fault_boxes],
            "identified_components": [c.model_dump() for c in case.identified_components],
            "hypotheses": [h.model_dump() for h in case.hypotheses],
            "active_test": case.active_test.model_dump() if case.active_test else None,
            "test_history": case.test_history,
            "repair_plan": case.repair_plan.model_dump() if case.repair_plan else None,
            "verification_result": case.verification_result.model_dump() if case.verification_result else None,
            "confidence_timeline": [t.model_dump() for t in case.confidence_timeline],
            "events": [evt.model_dump() for evt in case.events],
            "initial_image_url": case.initial_image_url,
            "latest_image_url": case.latest_image_url,
            "after_image_url": case.after_image_url,
            "updated_at": case.updated_at,
            "expires_at": case.expires_at,
            "resolved_at": case.resolved_at,
        }
        if include_id and case.id and is_valid_uuid(case.id):
            payload["id"] = case.id
        return payload

    async def create_case(self, case: DiagnosticCase) -> DiagnosticCase:
        """
        Create a new diagnostic case.
        When Supabase is connected and user_id is a valid UUID, sends payload WITHOUT 'id',
        allowing PostgreSQL DEFAULT gen_random_uuid() to generate the canonical database UUID.
        The returned database UUID is assigned as the case's canonical ID.
        In offline/in-memory mode, ensures case.id is a standard UUID v4 string.
        """
        case.updated_at = datetime.now(timezone.utc).isoformat()
        if not case.id or not is_valid_uuid(case.id):
            case.id = str(uuid.uuid4())

        client = self._client
        if client and is_valid_uuid(case.user_id):
            try:
                # Do NOT include "id" in payload for creation: let PostgreSQL generate the UUID
                payload = self._build_payload(case, include_id=False)
                resp = client.table("diagnostic_cases").insert(payload).execute()
                if resp.data and len(resp.data) > 0:
                    db_id = resp.data[0].get("id")
                    if db_id and is_valid_uuid(str(db_id)):
                        case.id = str(db_id)
                        self._persisted_ids.add(case.id)
                        logger.info("Supabase created diagnostic case with DB UUID: %s", case.id)
            except Exception as err:
                logger.warning("Supabase diagnostic_cases insert failed: %s", err)

        # In-memory update
        if case.user_id not in self._cases:
            self._cases[case.user_id] = {}
        self._cases[case.user_id][case.id] = case

        return case

    async def update_case(self, case: DiagnosticCase) -> DiagnosticCase:
        """
        Update an existing diagnostic case.
        Strictly validates that case.id is a valid UUID before sending to PostgreSQL.
        """
        if not is_valid_uuid(case.id):
            raise ValueError(f"INVALID_CASE_ID: '{case.id}' is not a valid UUID.")

        case.updated_at = datetime.now(timezone.utc).isoformat()

        # In-memory update
        if case.user_id not in self._cases:
            self._cases[case.user_id] = {}
        self._cases[case.user_id][case.id] = case

        client = self._client
        if client and is_valid_uuid(case.user_id):
            try:
                payload = self._build_payload(case, include_id=False)
                client.table("diagnostic_cases").update(payload).eq("id", case.id).eq("user_id", case.user_id).execute()
                self._persisted_ids.add(case.id)
            except Exception as err:
                logger.warning("Supabase diagnostic_cases update failed: %s", err)

        return case

    async def save_case(self, case: DiagnosticCase) -> DiagnosticCase:
        """
        Persist or update a diagnostic case.
        Routes to update_case if already tracked/persisted, otherwise create_case.
        """
        user_store = self._cases.get(case.user_id, {})
        if case.id in user_store or case.id in self._persisted_ids:
            return await self.update_case(case)
        return await self.create_case(case)

    async def get_case(self, user_id: str, case_id: str) -> Optional[DiagnosticCase]:
        """Fetch a specific diagnostic case ensuring strict user ownership."""
        await self.cleanup_expired_cases()

        # Pre-flight check: reject non-UUID strings before hitting PostgreSQL
        if not is_valid_uuid(case_id):
            # Check in-memory store for backward compatibility in mock tests
            user_store = self._cases.get(user_id, {})
            if case_id in user_store:
                return user_store[case_id]
            logger.warning("Rejected non-UUID case_id '%s' before database query.", case_id)
            return None

        # Check in-memory store
        user_store = self._cases.get(user_id, {})
        if case_id in user_store:
            return user_store[case_id]

        # Check Supabase
        client = self._client
        if client and is_valid_uuid(user_id):
            try:
                resp = (
                    client.table("diagnostic_cases")
                    .select("*")
                    .eq("id", case_id)
                    .eq("user_id", user_id)
                    .execute()
                )
                if resp.data and len(resp.data) > 0:
                    case = DiagnosticCase(**resp.data[0])
                    if user_id not in self._cases:
                        self._cases[user_id] = {}
                    self._cases[user_id][case.id] = case
                    self._persisted_ids.add(case.id)
                    return case
            except Exception as err:
                logger.warning("Supabase get diagnostic case failed: %s", err)

        return None

    async def list_cases(self, user_id: str, limit: int = 20) -> List[DiagnosticCase]:
        """List active diagnostic cases owned by the user, newest first."""
        await self.cleanup_expired_cases()

        cases: List[DiagnosticCase] = []

        client = self._client
        if client and is_valid_uuid(user_id):
            try:
                resp = (
                    client.table("diagnostic_cases")
                    .select("*")
                    .eq("user_id", user_id)
                    .order("updated_at", desc=True)
                    .limit(limit)
                    .execute()
                )
                if resp.data:
                    for row in resp.data:
                        try:
                            c = DiagnosticCase(**row)
                            cases.append(c)
                            self._persisted_ids.add(c.id)
                        except Exception:
                            continue
                    return cases
            except Exception as err:
                logger.warning("Supabase list diagnostic cases failed: %s", err)

        # Fallback to in-memory store
        user_store = self._cases.get(user_id, {})
        sorted_cases = sorted(
            user_store.values(),
            key=lambda c: c.updated_at,
            reverse=True,
        )
        return sorted_cases[:limit]

    async def delete_case(self, user_id: str, case_id: str) -> bool:
        """Delete a case and its associated resources."""
        # Remove from in-memory store
        user_store = self._cases.get(user_id, {})
        existed_local = user_store.pop(case_id, None) is not None
        self._persisted_ids.discard(case_id)

        # If not a valid UUID, don't query PostgreSQL
        if not is_valid_uuid(case_id):
            return existed_local

        # Remove from Supabase
        client = self._client
        if client and is_valid_uuid(user_id):
            try:
                client.table("diagnostic_cases").delete().eq("id", case_id).eq("user_id", user_id).execute()
                return True
            except Exception as err:
                logger.warning("Supabase delete diagnostic case failed: %s", err)

        return existed_local

    async def cleanup_expired_cases(self) -> int:
        """
        Automatic Expiration & Cleanup.
        Removes any diagnostic cases where expires_at has passed.
        """
        now = datetime.now(timezone.utc)
        removed_count = 0

        # Clean in-memory cases
        for user_id in list(self._cases.keys()):
            for case_id in list(self._cases[user_id].keys()):
                case = self._cases[user_id][case_id]
                try:
                    exp = datetime.fromisoformat(case.expires_at)
                    if exp < now:
                        del self._cases[user_id][case_id]
                        self._persisted_ids.discard(case_id)
                        removed_count += 1
                except Exception:
                    pass

        # Clean Supabase cases if configured
        client = self._client
        if client:
            try:
                client.table("diagnostic_cases").delete().lt("expires_at", now.isoformat()).execute()
            except Exception as err:
                logger.debug("Supabase expired cleanup query: %s", err)

        return removed_count


# ── Singleton Factory ────────────────────────────────────────────────────────

_case_service: Optional[DiagnosticCaseService] = None


def get_diagnostic_case_service() -> DiagnosticCaseService:
    global _case_service
    if _case_service is None:
        _case_service = DiagnosticCaseService()
    return _case_service
