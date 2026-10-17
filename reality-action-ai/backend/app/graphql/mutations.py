"""
REALITY → ACTION AI – GraphQL Mutations

analyzeReality  – Submit an image for AI analysis.
askFollowUp     – Ask a follow-up question about a prior analysis.
saveAnalysis    – Save a successful analysis to history.
deleteAnalysis  – Remove an analysis from history.
"""

from __future__ import annotations

import base64
from typing import Optional

import strawberry
from strawberry.types import Info

from app.graphql.schema import (
    AnalysisResultType,
    DeleteAnalysisResultType,
    FollowUpResultType,
    SaveAnalysisResultType,
)
from app.middleware.auth import get_user_id_from_request
from app.services.analysis_service import get_analysis_service
from app.services.history_service import get_history_service


@strawberry.type
class Mutation:
    @strawberry.mutation(
        description=(
            "Analyse a base-64 encoded image and return structured AI insights. "
            "image must be a valid data URL or raw base-64 string."
        )
    )
    async def analyze_reality(
        self,
        image: str,
        question: Optional[str] = strawberry.UNSET,
        session_id: Optional[str] = strawberry.UNSET,
    ) -> AnalysisResultType:
        # Basic validation: ensure image is non-empty
        if not image or len(image) < 10:
            raise ValueError("image must be a non-empty base-64 encoded string.")

        # Strip data-URL prefix if present (e.g. "data:image/jpeg;base64,...")
        if "," in image:
            image = image.split(",", 1)[1]

        # Validate base-64 decodability
        try:
            base64.b64decode(image, validate=True)
        except Exception as exc:
            raise ValueError(f"image is not valid base-64: {exc}") from exc

        service = get_analysis_service()
        result = await service.analyze(
            image_b64=image,
            question=question if question is not strawberry.UNSET else None,
            session_id=session_id if session_id is not strawberry.UNSET else None,
        )

        return AnalysisResultType(
            what_i_see=result.what_i_see,
            what_is_happening=result.what_is_happening,
            next_action=result.next_action,
            steps=result.steps,
            confidence=result.confidence,
            safety_warning=result.safety_warning,
            grounding_sources=result.grounding_sources,
        )

    @strawberry.mutation(
        description=(
            "Ask a follow-up question about a prior analysis session."
        )
    )
    async def ask_follow_up(
        self,
        session_id: str,
        question: str,
    ) -> FollowUpResultType:
        if not question.strip():
            raise ValueError("question must not be empty.")

        service = get_analysis_service()
        result = await service.ask_follow_up(
            session_id=session_id,
            question=question,
        )

        return FollowUpResultType(
            answer=result.answer,
            steps=result.steps,
            confidence=result.confidence,
            safety_warning=result.safety_warning,
            grounding_sources=result.grounding_sources,
        )

    @strawberry.mutation(
        description="Save a successful analysis result to the user's history."
    )
    async def save_analysis(
        self,
        info: Info,
        question: Optional[str] = None,
        what_i_see: str = "",
        what_is_happening: str = "",
        next_action: str = "",
        steps: Optional[list[str]] = None,
        confidence: float = 0.0,
        safety_warning: Optional[str] = None,
        image_url: Optional[str] = None,
    ) -> SaveAnalysisResultType:
        request = info.context["request"]
        user_id = get_user_id_from_request(request)

        if not user_id:
            return SaveAnalysisResultType(
                success=False,
                message="Authentication required.",
            )

        history = get_history_service()
        record = await history.save_analysis(
            user_id=user_id,
            question=question,
            what_i_see=what_i_see,
            what_is_happening=what_is_happening,
            next_action=next_action,
            steps=steps or [],
            confidence=confidence,
            safety_warning=safety_warning,
            image_url=image_url,
        )

        if record:
            return SaveAnalysisResultType(
                success=True,
                history_id=str(record.get("id", "")),
                message="Analysis saved to history.",
            )
        return SaveAnalysisResultType(
            success=False,
            message="Failed to save analysis. Supabase may not be configured.",
        )

    @strawberry.mutation(
        description="Delete an analysis from the user's history."
    )
    async def delete_analysis(
        self,
        info: Info,
        id: str,
    ) -> DeleteAnalysisResultType:
        request = info.context["request"]
        user_id = get_user_id_from_request(request)

        if not user_id:
            return DeleteAnalysisResultType(
                success=False,
                message="Authentication required.",
            )

        history = get_history_service()
        deleted = await history.delete_analysis(
            user_id=user_id,
            analysis_id=id,
        )

        if deleted:
            return DeleteAnalysisResultType(
                success=True,
                message="Analysis deleted.",
            )
        return DeleteAnalysisResultType(
            success=False,
            message="Failed to delete analysis.",
        )
