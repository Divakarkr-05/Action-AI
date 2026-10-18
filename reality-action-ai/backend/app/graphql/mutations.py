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
    ClearSessionResultType,
    DeleteAnalysisResultType,
    DiagnosticCaseType,
    EmergencyResponseType,
    FollowUpResultType,
    HelplineType,
    SaveAnalysisResultType,
    VisualFaultType,
    case_model_to_graphql_type,
)
from app.config.settings import get_settings
from app.middleware.auth import get_user_id_from_request
from app.services.analysis_service import get_analysis_service
from app.services.history_service import get_history_service
from app.services.safety_service import get_safety_service

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
            raw_bytes = base64.b64decode(image, validate=True)
        except Exception as exc:
            raise ValueError(f"image is not valid base-64: {exc}") from exc

        # Security: Enforce upload size limit
        settings = get_settings()
        if len(raw_bytes) > settings.max_upload_size_bytes:
            raise ValueError(
                f"Image payload size ({len(raw_bytes)} bytes) exceeds maximum allowed size ({settings.max_upload_size_mb} MB)."
            )

        # Security: MIME + Magic-byte validation (reject SVGs, HTML, executables, polyglots)
        is_png = raw_bytes.startswith(b"\x89PNG\r\n\x1a\n")
        is_jpeg = raw_bytes.startswith(b"\xff\xd8\xff")
        is_webp = len(raw_bytes) >= 12 and raw_bytes.startswith(b"RIFF") and raw_bytes[8:12] == b"WEBP"
        if not (is_png or is_jpeg or is_webp):
            raise ValueError(
                "Invalid image format or magic-bytes. Only genuine JPEG, PNG, and WebP images are permitted."
            )

        # Security: Image decompression-bomb protection (max 10 Megapixels)
        import io
        from PIL import Image

        Image.MAX_IMAGE_PIXELS = 10_000_000
        try:
            with Image.open(io.BytesIO(raw_bytes)) as img:
                img.verify()
                w, h = img.size
                if w * h > 10_000_000:
                    raise ValueError(f"Image pixel dimensions ({w}x{h}) exceed maximum allowed 10 Megapixels.")
        except Exception as exc:
            if "DecompressionBombError" in type(exc).__name__:
                raise ValueError("Image decompression bomb detected. Payload rejected.") from exc
            if isinstance(exc, ValueError):
                raise
            raise ValueError(f"Image decompression verification failed: {exc}") from exc

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

        # Detectra authenticity assessment context
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

        # ── SAFETY CLASSIFICATION & POLICY ENFORCEMENT ───────────────────────
        safety_svc = get_safety_service()
        user_query_str = question if question is not strawberry.UNSET and question else ""
        initial_safety_cat = safety_svc.classify_request(question=user_query_str)

        if initial_safety_cat != "NORMAL":
            safety_context = (
                f"AUTHORITATIVE SAFETY POLICY:\n"
                f"- Classified Safety State: {initial_safety_cat}\n"
                f"- Absolute rule: Immediate physical life-safety takes precedence over technical analysis.\n"
                f"- Strict constraints: Under NO circumstances provide advice that could facilitate self-harm, delay calling 112 emergency services, or touch unknown substances.\n"
                f"- Probabilistic language: An image alone is NOT proof. Use tentative phrasing ('possible', 'may indicate', 'cannot be confirmed from the image alone'). Never make definitive diagnoses or criminal accusations.\n"
                f"- You CANNOT downgrade or contradict this safety classification."
            )
        else:
            safety_context = (
                "SAFETY POLICY:\n"
                "- Adhere to life-safety guidelines at all times.\n"
                "- Observations are probabilistic; do NOT make definitive medical, criminal, or self-harm diagnoses from an image alone."
            )

        service = get_analysis_service()
        result = await service.analyze(
            image_b64=image,
            question=question if question is not strawberry.UNSET else None,
            session_id=session_id if session_id is not strawberry.UNSET else None,
            authenticity_context=authenticity_context,
            safety_context=safety_context,
        )

        # ── POST-ANALYSIS SAFETY IMMUTABILITY & SANITIZATION ──────────────────
        combined_output = (
            f"{result.what_i_see} {result.what_is_happening} {result.next_action} "
            f"{' '.join(result.steps or [])} {result.safety_warning or ''}"
        )
        emergency_resp = safety_svc.enforce_safety_policy(initial_safety_cat, combined_output)

        # Sanitize language against definitive claims
        sanitized_what_i_see = safety_svc.sanitize_claims(result.what_i_see)
        sanitized_what_is_happening = safety_svc.sanitize_claims(result.what_is_happening)
        sanitized_next_action = safety_svc.sanitize_claims(result.next_action)
        sanitized_steps = [safety_svc.sanitize_claims(s) for s in result.steps] if result.steps else []
        sanitized_warning = safety_svc.sanitize_claims(result.safety_warning) if result.safety_warning else None

        # Prioritize immediate safety over further AI analysis when critical
        if emergency_resp.emergency_required:
            if emergency_resp.immediate_actions:
                if emergency_resp.safety_category in (
                    "POSSIBLE_SELF_HARM",
                    "POSSIBLE_SUICIDE_ATTEMPT",
                    "POSSIBLE_SERIOUS_INJURY",
                    "POSSIBLE_UNCONSCIOUS_PERSON",
                ):
                    sanitized_next_action = emergency_resp.immediate_actions[0]
            if not sanitized_warning:
                sanitized_warning = f"{emergency_resp.title}: {emergency_resp.message}"

        emergency_response_type: Optional[EmergencyResponseType] = None
        if emergency_resp.safety_category != "NORMAL":
            emergency_response_type = EmergencyResponseType(
                safety_category=emergency_resp.safety_category,
                severity=emergency_resp.severity,
                emergency_required=emergency_resp.emergency_required,
                title=emergency_resp.title,
                message=emergency_resp.message,
                immediate_actions=emergency_resp.immediate_actions,
                avoid_actions=emergency_resp.avoid_actions,
                helplines=[
                    HelplineType(name=h.name, number=h.number)
                    for h in emergency_resp.helplines
                ],
            )

        visual_fault_types: Optional[list[VisualFaultType]] = None
        if result.visual_faults:
            visual_fault_types = [
                VisualFaultType(
                    id=f.id,
                    component_label=f.component_label,
                    description=f.description,
                    severity=f.severity,
                    ymin=f.ymin,
                    xmin=f.xmin,
                    ymax=f.ymax,
                    xmax=f.xmax,
                )
                for f in result.visual_faults
            ]

        return AnalysisResultType(
            what_i_see=sanitized_what_i_see,
            what_is_happening=sanitized_what_is_happening,
            next_action=sanitized_next_action,
            steps=sanitized_steps,
            confidence=result.confidence,
            safety_warning=sanitized_warning,
            grounding_sources=result.grounding_sources,
            visual_faults=visual_fault_types,
            image_authenticity=valid_status,
            ai_generated_probability=valid_prob,
            authenticity_confidence=valid_conf,
            authenticity_model=valid_model if valid_status else None,
            authenticity_indicators=valid_indicators if valid_status else None,
            safety_category=emergency_resp.safety_category,
            emergency_response=emergency_response_type,
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
        safety_category: Optional[str] = None,
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
            safety_category=safety_category,
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

    @strawberry.mutation(
        description="Explicitly clear and purge a private temporary conversation session."
    )
    async def clear_session(
        self,
        session_id: str,
    ) -> ClearSessionResultType:
        if not session_id or not session_id.strip():
            raise ValueError("session_id must not be empty.")
        from app.services.session_manager import get_session_manager
        cleared = get_session_manager().clear_session(session_id.strip())
        return ClearSessionResultType(
            success=cleared,
            session_id=session_id.strip(),
            message="Temporary session purged." if cleared else "Session not found or already expired.",
        )

    # ── Diagnostic Intelligence Engine Mutations ─────────────────────────────

    @strawberry.mutation(
        description="Initialize a complete closed-loop Diagnostic Case from an uploaded image."
    )
    async def create_diagnostic_case(
        self,
        info: Info,
        image: str,
        question: Optional[str] = strawberry.UNSET,
        session_id: Optional[str] = strawberry.UNSET,
    ) -> DiagnosticCaseType:
        if not image or len(image) < 10:
            raise ValueError("image must be a non-empty base-64 encoded string.")

        # Strip data URL prefix
        if "," in image:
            image_raw = image.split(",", 1)[1]
        else:
            image_raw = image

        raw_bytes = base64.b64decode(image_raw, validate=True)

        # Enforce size limit
        settings = get_settings()
        if len(raw_bytes) > settings.max_upload_size_bytes:
            raise ValueError(f"Image payload size exceeds {settings.max_upload_size_mb} MB limit.")

        # Magic byte validation
        is_png = raw_bytes.startswith(b"\x89PNG\r\n\x1a\n")
        is_jpeg = raw_bytes.startswith(b"\xff\xd8\xff")
        is_webp = len(raw_bytes) >= 12 and raw_bytes.startswith(b"RIFF") and raw_bytes[8:12] == b"WEBP"
        if not (is_png or is_jpeg or is_webp):
            raise ValueError("Invalid image format. Only JPEG, PNG, and WebP are accepted.")

        request = info.context["request"]
        user_id = get_user_id_from_request(request)
        sess_id = session_id if session_id is not strawberry.UNSET and session_id else "default_session"

        # If unauthenticated, use session-scoped isolation
        effective_user_id = user_id if user_id else f"anon_{sess_id}"

        from app.diagnostic.engine import DiagnosticEngine
        from app.diagnostic.case_service import get_diagnostic_case_service

        image_data_url = image if image.startswith("data:") else f"data:image/jpeg;base64,{image_raw}"
        case = await DiagnosticEngine.create_case_from_image(
            image_b64=image_raw,
            user_id=effective_user_id,
            session_id=sess_id,
            question=question if question is not strawberry.UNSET else None,
            image_url=image_data_url,
        )

        saved_case = await get_diagnostic_case_service().create_case(case)
        return case_model_to_graphql_type(saved_case)

    @strawberry.mutation(
        description="Submit a physical test measurement to update diagnostic hypotheses and confidence."
    )
    async def submit_diagnostic_test(
        self,
        info: Info,
        case_id: str,
        test_id: str,
        result_type: str,
        numeric_value: Optional[float] = strawberry.UNSET,
        unit: Optional[str] = strawberry.UNSET,
        text_value: Optional[str] = strawberry.UNSET,
        outcome_selection: Optional[str] = strawberry.UNSET,
        notes: Optional[str] = strawberry.UNSET,
    ) -> DiagnosticCaseType:
        from app.diagnostic.models import is_valid_uuid
        if not is_valid_uuid(case_id):
            raise ValueError(f"INVALID_CASE_ID: '{case_id}' is not a valid UUID.")

        request = info.context["request"]
        user_id = get_user_id_from_request(request)

        from app.diagnostic.case_service import get_diagnostic_case_service
        from app.diagnostic.engine import DiagnosticEngine
        from app.diagnostic.models import TestResultSubmission

        case_svc = get_diagnostic_case_service()

        effective_user_id = user_id if user_id else "anon_default_session"
        case = await case_svc.get_case(effective_user_id, case_id)
        if not case and not user_id:
            for uid, user_cases in case_svc._cases.items():
                if uid.startswith("anon_") and case_id in user_cases:
                    case = user_cases[case_id]
                    effective_user_id = uid
                    break

        if not case:
            raise ValueError(f"Diagnostic case '{case_id}' not found or access denied.")

        submission = TestResultSubmission(
            test_id=test_id,
            result_type=result_type,  # type: ignore
            numeric_value=numeric_value if numeric_value is not strawberry.UNSET else None,
            unit=unit if unit is not strawberry.UNSET else None,
            text_value=text_value if text_value is not strawberry.UNSET else None,
            outcome_selection=outcome_selection if outcome_selection is not strawberry.UNSET else None,
            notes=notes if notes is not strawberry.UNSET else None,
        )

        updated_case, _ = await DiagnosticEngine.interpret_test_result(case, submission)
        saved = await case_svc.update_case(updated_case)
        return case_model_to_graphql_type(saved)

    @strawberry.mutation(
        description="Verify physical repair by comparing post-repair image against the diagnostic baseline."
    )
    async def verify_repair(
        self,
        info: Info,
        case_id: str,
        after_image: str,
    ) -> DiagnosticCaseType:
        from app.diagnostic.models import is_valid_uuid
        if not is_valid_uuid(case_id):
            raise ValueError(f"INVALID_CASE_ID: '{case_id}' is not a valid UUID.")

        if not after_image or len(after_image) < 10:
            raise ValueError("after_image must be a non-empty base-64 encoded string.")

        if "," in after_image:
            after_raw = after_image.split(",", 1)[1]
        else:
            after_raw = after_image

        request = info.context["request"]
        user_id = get_user_id_from_request(request)

        from app.diagnostic.case_service import get_diagnostic_case_service
        from app.diagnostic.engine import DiagnosticEngine

        case_svc = get_diagnostic_case_service()
        effective_user_id = user_id if user_id else "anon_default_session"
        case = await case_svc.get_case(effective_user_id, case_id)
        if not case and not user_id:
            for uid, user_cases in case_svc._cases.items():
                if uid.startswith("anon_") and case_id in user_cases:
                    case = user_cases[case_id]
                    effective_user_id = uid
                    break

        if not case:
            raise ValueError(f"Diagnostic case '{case_id}' not found or access denied.")

        after_data_url = after_image if after_image.startswith("data:") else f"data:image/jpeg;base64,{after_raw}"
        updated_case, _ = await DiagnosticEngine.verify_repair(case, after_raw, after_image_url=after_data_url)
        saved = await case_svc.update_case(updated_case)
        return case_model_to_graphql_type(saved)

    @strawberry.mutation(
        description="Delete a diagnostic case and its temporary image resources."
    )
    async def delete_diagnostic_case(
        self,
        info: Info,
        case_id: str,
    ) -> bool:
        from app.diagnostic.models import is_valid_uuid
        if not is_valid_uuid(case_id):
            raise ValueError(f"INVALID_CASE_ID: '{case_id}' is not a valid UUID.")

        request = info.context["request"]
        user_id = get_user_id_from_request(request)

        from app.diagnostic.case_service import get_diagnostic_case_service
        case_svc = get_diagnostic_case_service()
        effective_user_id = user_id if user_id else "anon_default_session"

        deleted = await case_svc.delete_case(effective_user_id, case_id)
        if not deleted and not user_id:
            for uid, user_cases in list(case_svc._cases.items()):
                if uid.startswith("anon_") and case_id in user_cases:
                    deleted = await case_svc.delete_case(uid, case_id)
                    break
        return deleted
