"""
REALITY → ACTION AI – GraphQL Queries
"""

from __future__ import annotations

from typing import List, Optional

import strawberry
from strawberry.types import Info

from app.config.settings import get_settings
from app.graphql.schema import (
    AnalysisHistoryItemType,
    HealthType,
)
from app.middleware.auth import get_user_id_from_request
from app.services.history_service import get_history_service


def _dict_to_history_item(record: dict) -> AnalysisHistoryItemType:
    """Convert a Supabase row dict to a GraphQL type."""
    return AnalysisHistoryItemType(
        id=str(record.get("id", "")),
        question=record.get("question"),
        what_i_see=record.get("what_i_see"),
        what_is_happening=record.get("what_is_happening"),
        next_action=record.get("next_action"),
        steps=record.get("steps"),
        confidence=float(record["confidence"]) if record.get("confidence") is not None else None,
        safety_warning=record.get("safety_warning"),
        image_url=record.get("image_url"),
        created_at=record.get("created_at"),
    )


@strawberry.type
class Query:
    @strawberry.field(description="Service health check.")
    def health(self) -> HealthType:
        settings = get_settings()
        return HealthType(
            status="ok",
            version="0.1.0",
            ai_mode=settings.ai_mode,
            model=settings.hf_model,
        )

    @strawberry.field(description="Fetch the authenticated user's analysis history.")
    async def analysis_history(
        self,
        info: Info,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[AnalysisHistoryItemType]:
        request = info.context["request"]
        user_id = get_user_id_from_request(request)

        if not user_id:
            raise PermissionError("Authentication required.")

        service = get_history_service()
        records = await service.get_user_history(
            user_id=user_id,
            search=search,
            limit=limit,
            offset=offset,
        )
        return [_dict_to_history_item(r) for r in records]

    @strawberry.field(description="Fetch a single analysis by ID.")
    async def analysis(
        self,
        info: Info,
        id: str,
    ) -> Optional[AnalysisHistoryItemType]:
        request = info.context["request"]
        user_id = get_user_id_from_request(request)

        if not user_id:
            raise PermissionError("Authentication required.")

        service = get_history_service()
        record = await service.get_analysis_by_id(
            user_id=user_id,
            analysis_id=id,
        )
        if not record:
            return None
        return _dict_to_history_item(record)
