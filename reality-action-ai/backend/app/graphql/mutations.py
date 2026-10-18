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

import logging
from app.graphql.schema import (
    AnalysisResultType,
    DeleteAnalysisResultType,
    FollowUpResultType,
    SaveAnalysisResultType,
)
from app.middleware.auth import get_user_id_from_request
from app.services.analysis_service import get_analysis_service
from app.services.history_service import get_history_service

logger = logging.getLogger(__name__)


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
        image_authenticity: Optional[str] = strawberry.UNSET,
        ai_generated_probability: Optional[float] = strawberry.UNSET,
        authenticity_confidence: Optional[float] = strawberry.UNSET,
        authenticity_model: Optional[str] = strawberry.UNSET,
        authenticity_indicators: Optional[list[str]] = strawberry.UNSET,
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

        # Validate authenticity values if provided
        valid_prob: Optional[float] = None
        if ai_generated_probability is not strawberry.UNSET and ai_generated_probability is not None:
            import math
            try:
                prob_float = float(ai_generated_probability)
                if math.isnan(prob_float) or math.isinf(prob_float) or prob_float < 0.0 or prob_float > 1.0:
                    raise ValueError("ai_generated_probability must be a number between 0.0 and 1.0")
                valid_prob = round(prob_float, 4)
            except (TypeError, ValueError) as exc:
                raise ValueError(f"Invalid ai_generated_probability: {exc}")

        valid_conf: Optional[float] = None
        if authenticity_confidence is not strawberry.UNSET and authenticity_confidence is not None:
            import math
            try:
                conf_float = float(authenticity_confidence)
                if math.isnan(conf_float) or math.isinf(conf_float) or conf_float < 0.0 or conf_float > 1.0:
                    raise ValueError("authenticity_confidence must be a number between 0.0 and 1.0")
                valid_conf = round(conf_float, 4)
            except (TypeError, ValueError) as exc:
                raise ValueError(f"Invalid authenticity_confidence: {exc}")

        valid_status: Optional[str] = None
        if image_authenticity is not strawberry.UNSET and image_authenticity is not None:
            if image_authenticity in ("LIKELY_REAL", "LIKELY_AI_GENERATED", "UNCERTAIN", "UNAVAILABLE"):
                valid_status = image_authenticity
            else:
                valid_status = "UNAVAILABLE"

        valid_model: Optional[str] = None
        if authenticity_model is not strawberry.UNSET and authenticity_model is not None:
            valid_model = str(authenticity_model).strip()[:100]

        valid_indicators: Optional[list[str]] = None
        if authenticity_indicators is not strawberry.UNSET and authenticity_indicators is not None:
            valid_indicators = [
                str(ind).strip() for ind in authenticity_indicators if str(ind).strip()
            ]

        # Prepare context for Gemma / Sarvam
        authenticity_context: Optional[str] = None
        if valid_status:
            authenticity_context = (
                f"AUTHENTICITY ASSESSMENT (Detectra v3):\n"
                f"- Status: {valid_status}\n"
                f"- AI-generated probability: {valid_prob if valid_prob is not None else 'N/A'}\n"
                f"- Model: {valid_model or 'Detectra v3'}\n"
                f"- Indicators: {', '.join(valid_indicators) if valid_indicators else 'Model-based classification'}\n"
                f"(Note: The numerical detector result is authoritative. You may reference or explain this technical context, but do not contradict the status.)"
            )

        service = get_analysis_service()
        result = await service.analyze(
            image_b64=image,
            question=question if question is not strawberry.UNSET else None,
            session_id=session_id if session_id is not strawberry.UNSET else None,
            authenticity_context=authenticity_context,
        )

        return AnalysisResultType(
            what_i_see=result.what_i_see,
            what_is_happening=result.what_is_happening,
            next_action=result.next_action,
            steps=result.steps,
            confidence=result.confidence,
            safety_warning=result.safety_warning,
            grounding_sources=result.grounding_sources,
            image_authenticity=valid_status,
            ai_generated_probability=valid_prob,
            authenticity_confidence=valid_conf,
            authenticity_model=valid_model if valid_status else None,
            authenticity_indicators=valid_indicators if valid_status else None,
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
        image_authenticity: Optional[str] = None,
        ai_generated_probability: Optional[float] = None,
        authenticity_confidence: Optional[float] = None,
        authenticity_model: Optional[str] = None,
        authenticity_indicators: Optional[list[str]] = None,
    ) -> SaveAnalysisResultType:
        request = info.context["request"]
        user_id = get_user_id_from_request(request)

        if not user_id:
            logger.warning("save_analysis mutation rejected: unauthenticated request (user_id is None)")
            return SaveAnalysisResultType(
                success=False,
                message="Authentication required.",
            )

        # Validate numeric probability if provided
        valid_prob: Optional[float] = None
        if ai_generated_probability is not None:
            import math
            try:
                p_val = float(ai_generated_probability)
                if not (math.isnan(p_val) or math.isinf(p_val) or p_val < 0.0 or p_val > 1.0):
                    valid_prob = round(p_val, 4)
            except (ValueError, TypeError):
                valid_prob = None

        valid_conf: Optional[float] = None
        if authenticity_confidence is not None:
            import math
            try:
                c_val = float(authenticity_confidence)
                if not (math.isnan(c_val) or math.isinf(c_val) or c_val < 0.0 or c_val > 1.0):
                    valid_conf = round(c_val, 4)
            except (ValueError, TypeError):
                valid_conf = None

        logger.info("save_analysis mutation invoked for user_id=%s", user_id)
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
            image_authenticity=image_authenticity,
            ai_generated_probability=valid_prob,
            authenticity_confidence=valid_conf,
            authenticity_model=authenticity_model,
            authenticity_indicators=authenticity_indicators,
        )

        if record:
            hist_id = str(record.get("id", ""))
            logger.info("save_analysis mutation succeeded: history_id=%s", hist_id)
            return SaveAnalysisResultType(
                success=True,
                history_id=hist_id,
                message="Analysis saved to history.",
            )
        logger.error("save_analysis mutation failed: record returned None from history_service")
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
