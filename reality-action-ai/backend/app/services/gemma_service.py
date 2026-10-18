"""
REALITY → ACTION AI – Gemma 4 Multimodal Inference Service

Communicates with Google Gemma 4 via Hugging Face Inference Providers.
Core Philosophy:
  REALITY (See it) → UNDERSTANDING → REASONING → ACTION (Act)
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Any, Dict, List, Optional

from huggingface_hub import InferenceClient

from app.config.settings import get_settings
from app.schemas.models import AnalysisResult, FollowUpResult

logger = logging.getLogger(__name__)

# ── Gemma 4 System Instructions ──────────────────────────────────────────────

GEMMA_SYSTEM_PROMPT = """You are REALITY → ACTION AI, a multimodal visual reasoning assistant powered by Google Gemma 4.
Your core philosophy:
REALITY → UNDERSTANDING → REASONING → ACTION
(SEE IT. UNDERSTAND IT. ACT.)

You inspect real-world technical images (machinery, circuits, electronics, appliances, error screens, tools, hardware) and provide immediate, practical, structured action steps.

CRITICAL RULES:
1. Inspect the supplied image thoroughly.
2. Describe ONLY information actually visible and supported by the image. Never invent components, measurements, labels, damage, symptoms, or other visual details.
3. Determine what appears to be happening (diagnosis/interpretation of physical condition).
4. Identify the single most useful immediate action to take.
5. Produce concrete, practical, ordered step-by-step guidance.
6. Clearly state uncertainty when the image does not provide enough information or is ambiguous. Never claim false certainty.
7. Prominently include safety warnings for electrical systems, high voltage, capacitors, pressurized fluids, moving mechanical parts, chemical hazards, fire hazards, or structural damage.
8. Recommend professional licensed assistance when situations are hazardous or exceed DIY safety limits.
9. Prefer simple, clear, actionable technical language.

OUTPUT FORMAT:
You MUST respond with valid, parseable JSON conforming strictly to this schema:
{
  "what_i_see": "Concise visual breakdown of visible components and physical condition.",
  "what_is_happening": "Technical interpretation of the current state, failure, or problem.",
  "next_action": "The single most important immediate action to take right now.",
  "steps": [
    "Step 1: ...",
    "Step 2: ...",
    "Step 3: ..."
  ],
  "confidence": 0.85,
  "safety_warning": "Warning text if hazard exists, or null if completely safe."
}
Do NOT include any text outside the JSON object."""


GEMMA_FOLLOW_UP_SYSTEM_PROMPT = """You are REALITY → ACTION AI, answering a follow-up question about an ongoing technical inspection.
Use the prior analysis context (what was seen, what was happening, next action, steps, and safety warnings) to ground your answer.

CRITICAL RULES:
1. Answer directly based on the inspected reality and prior findings.
2. If the user asks about specific steps (e.g. 'explain step 2'), explain in detail.
3. If safety is queried ('is it safe?'), prioritize safety rules and highlight risks.
4. If an alternative is asked ('what if that doesn't work?'), provide troubleshooting alternatives.
5. Do not hallucinate or contradict previous observations.

OUTPUT FORMAT:
You MUST respond with valid JSON:
{
  "answer": "Clear, direct, and actionable answer to the user's question.",
  "steps": ["Optional additional step 1", "Optional additional step 2"] or null,
  "confidence": 0.85,
  "safety_warning": "Safety advice if applicable, or null."
}
Do NOT include any text outside the JSON object."""


# ── Helpers ──────────────────────────────────────────────────────────────────

def _ensure_data_url(image_b64: str) -> str:
    """Format a raw base-64 string into a valid data URL with MIME type."""
    if image_b64.startswith("data:"):
        return image_b64

    # Detect common MIME headers
    if image_b64.startswith("iVBORw0KGgo"):
        mime = "image/png"
    elif image_b64.startswith("UklGR"):
        mime = "image/webp"
    else:
        mime = "image/jpeg"

    return f"data:{mime};base64,{image_b64}"


def _clean_json_str(raw: str) -> str:
    """Extract JSON string from potential markdown fences or surrounding text."""
    trimmed = raw.strip()

    # Match ```json ... ``` or ``` ... ```
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", trimmed, re.IGNORECASE)
    if match:
        return match.group(1).strip()

    # Look for the first '{' and last '}'
    start = trimmed.find("{")
    end = trimmed.rfind("}")
    if start != -1 and end != -1 and end > start:
        return trimmed[start : end + 1]

    return trimmed


def _format_rag_context(retrieved_chunks: List[Any]) -> str:
    """Format retrieved knowledge chunks into delimited prompt context."""
    if not retrieved_chunks:
        return ""

    chunk_blocks = []
    for chunk in retrieved_chunks:
        chunk_blocks.append(f"[{chunk.source}]\n{chunk.content}")

    joined_chunks = "\n\n".join(chunk_blocks)
    return (
        "RELEVANT TECHNICAL REFERENCES\n"
        "---\n"
        f"{joined_chunks}\n"
        "---\n"
        "INSTRUCTION: Use the retrieved technical references above as grounding and domain reference where applicable. "
        "Do NOT blindly follow them if they conflict with obvious visual evidence in the image or critical safety constraints. "
        "Visual reality and immediate physical safety always take precedence."
    )


# ── GemmaService ─────────────────────────────────────────────────────────────

class GemmaService:
    """
    Multimodal AI analysis using Google Gemma 4 via Hugging Face Inference Providers.
    """

    def __init__(self, hf_token: str, model: str) -> None:
        self._token = (hf_token or "").strip()
        self._model = (model or "google/gemma-4-31B-it").strip()

        # Initialize InferenceClient
        # api_key is None if token is empty; timeout handles network delays
        self._client = InferenceClient(
            api_key=self._token if self._token else None,
            provider="auto",
            timeout=60.0,
        )

        # In-memory session store for follow-up continuity
        self._sessions: Dict[str, Dict[str, Any]] = {}
        self._latest_session: Optional[Dict[str, Any]] = None

    # ── Analyze Reality ──────────────────────────────────────────────────────

    async def analyze(
        self,
        image_b64: str,
        question: Optional[str] = None,
        session_id: Optional[str] = None,
        authenticity_context: Optional[str] = None,
    ) -> AnalysisResult:
        """
        Analyze a real-world image using Gemma 4 multimodal chat completion.
        """
        if not self._token:
            raise ValueError(
                "Hugging Face API token (HF_TOKEN) is not configured in backend/.env. "
                "Please configure a valid HF_TOKEN or set AI_MODE=mock in backend/.env."
            )

        if not image_b64 or len(image_b64) < 10:
            raise ValueError("Invalid or empty image data provided.")

        data_url = _ensure_data_url(image_b64)

        # Construct multimodal user message content
        user_prompt_text = (
            question.strip()
            if question and question.strip()
            else "Inspect what is shown in this image. Diagnose the condition and provide action steps."
        )

        # RAG Retrieval: retrieve technical references relevant to the question/inspection
        retrieval_query = (
            question.strip()
            if question and question.strip()
            else "electrical safety mechanical belt capacitor hvac network troubleshooting"
        )
        retrieved_chunks = []
        try:
            from app.services.rag_service import get_rag_service

            rag = get_rag_service()
            retrieved_chunks = await rag.retrieve(retrieval_query, top_k=3)
        except Exception as rag_err:
            logger.warning("RAG retrieval failed during analyze: %s", rag_err)

        rag_prompt_section = _format_rag_context(retrieved_chunks)
        grounding_sources = list(dict.fromkeys(c.source for c in retrieved_chunks))

        # Compose final user text with technical grounding references
        prompt_parts = []
        if authenticity_context:
            prompt_parts.append(authenticity_context)
        if rag_prompt_section:
            prompt_parts.append(rag_prompt_section)
        prompt_parts.append(user_prompt_text)
        final_prompt_text = "\n\n".join(prompt_parts)

        messages = [
            {"role": "system", "content": GEMMA_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": data_url},
                    },
                    {
                        "type": "text",
                        "text": final_prompt_text,
                    },
                ],
            },
        ]

        logger.info(
            "Calling Gemma 4 (%s) via Hugging Face Inference Providers (RAG sources: %s)...",
            self._model,
            grounding_sources,
        )

        try:
            # Run blocking InferenceClient call in async thread pool
            response = await asyncio.to_thread(
                self._client.chat_completion,
                messages=messages,
                model=self._model,
                max_tokens=1024,
                temperature=0.2,
            )

            raw_text = (
                response.choices[0].message.content
                if response.choices and response.choices[0].message
                else ""
            )

            if not raw_text:
                raise ValueError("Gemma returned an empty response.")

        except Exception as exc:
            self._handle_api_error(exc)

        # Parse and validate the response
        result = self._parse_analysis_response(raw_text)
        result.grounding_sources = grounding_sources

        # Cache session context for follow-up questions
        session_context = {
            "image_b64": image_b64,
            "question": user_prompt_text,
            "analysis": result,
            "history": [
                {"role": "user", "content": user_prompt_text},
                {"role": "assistant", "content": raw_text},
            ],
        }
        if session_id:
            self._sessions[session_id] = session_context
        self._latest_session = session_context

        return result

    # ── Ask Follow-Up ────────────────────────────────────────────────────────

    async def ask_follow_up(
        self,
        session_id: str,
        question: str,
    ) -> FollowUpResult:
        """
        Answer a follow-up question grounded in the previous inspection session.
        """
        if not self._token:
            raise ValueError(
                "Hugging Face API token (HF_TOKEN) is not configured in backend/.env. "
                "Please configure a valid HF_TOKEN or set AI_MODE=mock in backend/.env."
            )

        if not question or not question.strip():
            raise ValueError("Question must not be empty.")

        # Retrieve prior session context
        ctx = self._sessions.get(session_id) or self._latest_session

        context_summary = ""
        if ctx and "analysis" in ctx:
            prior: AnalysisResult = ctx["analysis"]
            context_summary = (
                f"PRIOR INSPECTION FINDINGS:\n"
                f"- What was seen: {prior.what_i_see}\n"
                f"- Problem/State: {prior.what_is_happening}\n"
                f"- Recommended Next Action: {prior.next_action}\n"
                f"- Provided Steps: {', '.join(prior.steps)}\n"
                f"- Safety Warning: {prior.safety_warning or 'None'}\n"
            )

        # RAG Retrieval for follow-up question
        retrieved_chunks = []
        try:
            from app.services.rag_service import get_rag_service

            rag = get_rag_service()
            retrieved_chunks = await rag.retrieve(question.strip(), top_k=3)
        except Exception as rag_err:
            logger.warning("RAG retrieval failed during follow-up: %s", rag_err)

        rag_prompt_section = _format_rag_context(retrieved_chunks)
        grounding_sources = list(dict.fromkeys(c.source for c in retrieved_chunks))

        user_content_parts = []
        if rag_prompt_section:
            user_content_parts.append(rag_prompt_section)
        if context_summary:
            user_content_parts.append(context_summary)
        user_content_parts.append(f"FOLLOW-UP QUESTION:\n{question.strip()}")
        user_content = "\n\n".join(user_content_parts)

        messages = [
            {"role": "system", "content": GEMMA_FOLLOW_UP_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ]

        logger.info(
            "Calling Gemma 4 follow-up for session %s (RAG sources: %s)...",
            session_id,
            grounding_sources,
        )

        try:
            response = await asyncio.to_thread(
                self._client.chat_completion,
                messages=messages,
                model=self._model,
                max_tokens=600,
                temperature=0.3,
            )

            raw_text = (
                response.choices[0].message.content
                if response.choices and response.choices[0].message
                else ""
            )

            if not raw_text:
                raise ValueError("Gemma returned an empty follow-up response.")

        except Exception as exc:
            self._handle_api_error(exc)

        result = self._parse_follow_up_response(raw_text)
        result.grounding_sources = grounding_sources

        # Store turn in session history if available
        if ctx and "history" in ctx:
            ctx["history"].append({"role": "user", "content": question})
            ctx["history"].append({"role": "assistant", "content": result.answer})
            self._sessions[session_id] = ctx

        return result

    # ── Parsing & Fallback Logic ─────────────────────────────────────────────

    def _parse_analysis_response(self, raw_text: str) -> AnalysisResult:
        """Parse raw Gemma output into a validated AnalysisResult model."""
        clean_text = _clean_json_str(raw_text)
        data: Dict[str, Any] = {}

        try:
            data = json.loads(clean_text)
        except Exception:
            logger.warning("Primary JSON decode failed. Attempting fallback extraction...")
            data = self._fallback_extract_analysis(raw_text)

        # Validate and normalize fields
        what_i_see = str(data.get("what_i_see") or "").strip()
        what_is_happening = str(data.get("what_is_happening") or "").strip()
        next_action = str(data.get("next_action") or "").strip()

        if not what_i_see or not what_is_happening or not next_action:
            # If any primary fields are missing, try regex fallback
            data = self._fallback_extract_analysis(raw_text)
            what_i_see = str(data.get("what_i_see") or "").strip()
            what_is_happening = str(data.get("what_is_happening") or "").strip()
            next_action = str(data.get("next_action") or "").strip()

        if not what_i_see or not what_is_happening or not next_action:
            raise ValueError(
                "Gemma 4 response did not contain required analysis fields. "
                "Please try again with a clearer image or question."
            )

        # Parse steps list
        raw_steps = data.get("steps")
        steps: List[str] = []
        if isinstance(raw_steps, list):
            steps = [str(s).strip() for s in raw_steps if str(s).strip()]
        elif isinstance(raw_steps, str) and raw_steps.strip():
            steps = [
                s.strip().lstrip("0123456789.-) ")
                for s in raw_steps.split("\n")
                if s.strip()
            ]

        if not steps:
            steps = ["Inspect the component carefully.", "Follow standard safety procedures."]

        # Parse confidence (clamped 0.0 - 1.0)
        try:
            conf_val = float(data.get("confidence", 0.85))
            confidence = max(0.0, min(1.0, round(conf_val, 2)))
        except (ValueError, TypeError):
            confidence = 0.85

        # Parse safety warning
        raw_warning = data.get("safety_warning")
        safety_warning: Optional[str] = None
        if raw_warning and str(raw_warning).strip().lower() not in ("null", "none", ""):
            safety_warning = str(raw_warning).strip()

        return AnalysisResult(
            what_i_see=what_i_see,
            what_is_happening=what_is_happening,
            next_action=next_action,
            steps=steps,
            confidence=confidence,
            safety_warning=safety_warning,
        )

    def _fallback_extract_analysis(self, text: str) -> Dict[str, Any]:
        """Regex-based fallback extraction if JSON formatting is imperfect."""
        data: Dict[str, Any] = {}

        see_match = re.search(r'"what_i_see"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', text)
        if see_match:
            data["what_i_see"] = see_match.group(1).replace('\\"', '"')

        happening_match = re.search(r'"what_is_happening"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', text)
        if happening_match:
            data["what_is_happening"] = happening_match.group(1).replace('\\"', '"')

        action_match = re.search(r'"next_action"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', text)
        if action_match:
            data["next_action"] = action_match.group(1).replace('\\"', '"')

        # Steps array match
        steps_match = re.search(r'"steps"\s*:\s*\[([\s\S]*?)\]', text)
        if steps_match:
            items = re.findall(r'"([^"\\]*(?:\\.[^"\\]*)*)"', steps_match.group(1))
            if items:
                data["steps"] = [i.replace('\\"', '"') for i in items]

        # Confidence match
        conf_match = re.search(r'"confidence"\s*:\s*([0-9.]+)', text)
        if conf_match:
            data["confidence"] = float(conf_match.group(1))

        # Safety warning match
        safety_match = re.search(r'"safety_warning"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', text)
        if safety_match:
            data["safety_warning"] = safety_match.group(1).replace('\\"', '"')

        return data

    def _parse_follow_up_response(self, raw_text: str) -> FollowUpResult:
        """Parse raw Gemma follow-up output into FollowUpResult."""
        clean_text = _clean_json_str(raw_text)
        data: Dict[str, Any] = {}

        try:
            data = json.loads(clean_text)
        except Exception:
            logger.warning("Follow-up JSON decode failed, using raw text as answer.")
            data = {"answer": raw_text.strip()}

        answer = str(data.get("answer") or raw_text).strip()
        if not answer:
            answer = "I have reviewed your follow-up request. Please proceed with caution according to the recommended steps."

        raw_steps = data.get("steps")
        steps: Optional[List[str]] = None
        if isinstance(raw_steps, list):
            steps = [str(s).strip() for s in raw_steps if str(s).strip()]

        try:
            confidence = max(0.0, min(1.0, float(data.get("confidence", 0.85))))
        except (ValueError, TypeError):
            confidence = 0.85

        raw_warning = data.get("safety_warning")
        safety_warning: Optional[str] = None
        if raw_warning and str(raw_warning).strip().lower() not in ("null", "none", ""):
            safety_warning = str(raw_warning).strip()

        return FollowUpResult(
            answer=answer,
            steps=steps,
            confidence=round(confidence, 2),
            safety_warning=safety_warning,
        )

    # ── Error Sanitizer ──────────────────────────────────────────────────────

    def _handle_api_error(self, exc: Exception) -> None:
        """
        Log detailed error internally and raise user-safe exceptions.
        NEVER expose secrets or tokens to the frontend.
        """
        logger.error("Hugging Face API error encountered: %s", exc, exc_info=True)
        err_msg = str(exc).lower()

        if "401" in err_msg or "unauthorized" in err_msg or "invalid token" in err_msg:
            raise ValueError(
                "Invalid or unauthorized Hugging Face token. "
                "Please verify the HF_TOKEN configured in backend/.env."
            ) from None

        if "403" in err_msg or "forbidden" in err_msg:
            raise ValueError(
                "Hugging Face access forbidden. "
                "Please ensure your token has permission to access Inference Providers."
            ) from None

        if "404" in err_msg or "not found" in err_msg:
            raise ValueError(
                f"Model '{self._model}' is not available on Hugging Face Inference Providers. "
                "Please verify the model identifier."
            ) from None

        if "429" in err_msg or "rate limit" in err_msg:
            raise ValueError(
                "Hugging Face API rate limit reached. Please wait a few moments and try again."
            ) from None

        if "503" in err_msg or "loading" in err_msg or "temporarily unavailable" in err_msg:
            raise ValueError(
                "The Gemma 4 model is currently warming up on Hugging Face. "
                "Please wait 20-30 seconds and retry."
            ) from None

        if "timeout" in err_msg or "timed out" in err_msg:
            raise ValueError(
                "Request to Hugging Face Inference Providers timed out. "
                "Please check your internet connection and try again."
            ) from None

        raise ValueError(
            "An error occurred while contacting Hugging Face Inference Providers. "
            "Please check backend logs or try again."
        ) from None


# ── Service Singleton Factory ────────────────────────────────────────────────

_gemma_service: Optional[GemmaService] = None


def get_gemma_service() -> GemmaService:
    global _gemma_service
    settings = get_settings()
    if _gemma_service is None or _gemma_service._token != settings.hf_token or _gemma_service._model != settings.hf_model:
        _gemma_service = GemmaService(
            hf_token=settings.hf_token,
            model=settings.hf_model,
        )
    return _gemma_service
