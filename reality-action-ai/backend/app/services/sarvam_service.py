"""
REALITY → ACTION AI – Sarvam AI Multimodal Inference Service

Communicates with Sarvam AI API (supporting models such as gemma4, sarvam-105b, etc.).
Core Philosophy:
  REALITY (See it) → UNDERSTANDING → REASONING → ACTION (Act)
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Any, Dict, List, Optional

import httpx

from app.config.settings import get_settings
from app.schemas.models import AnalysisResult, FollowUpResult, VisualFault

logger = logging.getLogger(__name__)

# ── System Instructions ──────────────────────────────────────────────────────

SARVAM_SYSTEM_PROMPT = """You are REALITY → ACTION AI, an advanced multimodal visual reasoning assistant.
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
10. VISUAL FAULT PINPOINTING: Locate and mark suspected defective components, damaged areas, burnt traces, bulging capacitors, loose connectors, or points of interest. Provide normalized bounding coordinates (ymin, xmin, ymax, xmax between 0.0 and 1.0 where top-left is 0.0, 0.0 and bottom-right is 1.0, 1.0). If no distinct fault can be spatially located, provide an empty array [].

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
  "safety_warning": "Warning text if hazard exists, or null if completely safe.",
  "visual_faults": [
    {
      "id": "fault_1",
      "component_label": "Identified Component or Region (e.g. Primary Drive Belt / Leaf Tip / Capacitor C12)",
      "description": "Specific visual defect or condition observed",
      "severity": "CRITICAL / WARNING / INFO",
      "ymin": 0.22,
      "xmin": 0.35,
      "ymax": 0.45,
      "xmax": 0.65
    }
  ]
}
Do NOT include any text outside the JSON object."""


SARVAM_FOLLOW_UP_SYSTEM_PROMPT = """You are REALITY → ACTION AI, answering a follow-up question about an ongoing technical inspection.
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
    """Strip markdown code fence blocks from a raw LLM output."""
    raw = raw.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw)
    if match:
        return match.group(1).strip()
    return raw


def _format_rag_context(retrieved_chunks: List[Any]) -> str:
    """Format RAG knowledge chunks for insertion into system or user prompt."""
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


def _parse_visual_faults(raw_faults: Any) -> List[VisualFault]:
    """Defensively parse, normalize, and clamp visual faults with spatial coordinates."""
    if not isinstance(raw_faults, list):
        return []

    parsed: List[VisualFault] = []
    for idx, item in enumerate(raw_faults):
        if not isinstance(item, dict):
            continue
        try:
            fault_id = str(item.get("id") or f"fault_{idx + 1}").strip()
            label = str(item.get("component_label") or item.get("label") or f"Component {idx + 1}").strip()
            desc = str(item.get("description") or "Suspected fault location").strip()
            sev = str(item.get("severity") or "WARNING").strip().upper()
            if sev not in ("CRITICAL", "WARNING", "INFO"):
                sev = "WARNING"

            # Parse coordinates
            ymin = float(item.get("ymin", 0.0))
            xmin = float(item.get("xmin", 0.0))
            ymax = float(item.get("ymax", 1.0))
            xmax = float(item.get("xmax", 1.0))

            # Auto-scale if model used 0-1000 or 0-100 coordinate systems
            if any(c > 1.0 for c in (ymin, xmin, ymax, xmax)):
                max_coord = max(ymin, xmin, ymax, xmax)
                if max_coord <= 100.0:
                    ymin /= 100.0
                    xmin /= 100.0
                    ymax /= 100.0
                    xmax /= 100.0
                elif max_coord <= 1000.0:
                    ymin /= 1000.0
                    xmin /= 1000.0
                    ymax /= 1000.0
                    xmax /= 1000.0

            # Clamp between 0.0 and 1.0
            ymin = max(0.0, min(1.0, ymin))
            xmin = max(0.0, min(1.0, xmin))
            ymax = max(0.0, min(1.0, ymax))
            xmax = max(0.0, min(1.0, xmax))

            # Ensure proper min/max ordering
            if ymin > ymax:
                ymin, ymax = ymax, ymin
            if xmin > xmax:
                xmin, xmax = xmax, xmin

            # Ensure box has minimum visible dimension
            if (ymax - ymin) < 0.01:
                ymax = min(1.0, ymin + 0.05)
            if (xmax - xmin) < 0.01:
                xmax = min(1.0, xmin + 0.05)

            parsed.append(
                VisualFault(
                    id=fault_id,
                    component_label=label,
                    description=desc,
                    severity=sev,
                    ymin=round(ymin, 4),
                    xmin=round(xmin, 4),
                    ymax=round(ymax, 4),
                    xmax=round(xmax, 4),
                )
            )
        except Exception as parse_err:
            logger.debug("Skipping unparseable visual fault item: %s", parse_err)
            continue

    return parsed


# ── SarvamService ────────────────────────────────────────────────────────────

class SarvamService:
    """
    Multimodal AI analysis using Sarvam AI API.
    """

    def __init__(self, api_key: str, model: str = "gemma4", base_url: str = "https://api.sarvam.ai/v2") -> None:
        self._api_key = (api_key or "").strip()
        self._model = (model or "gemma4").strip()
        self._base_url = (base_url or "https://api.sarvam.ai/v2").rstrip("/")

        # In-memory session store for follow-up continuity
        self._sessions: Dict[str, Dict[str, Any]] = {}
        self._latest_session: Optional[Dict[str, Any]] = None

    def _get_headers(self) -> Dict[str, str]:
        return {
            "api-subscription-key": self._api_key,
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    # ── Analyze Reality ──────────────────────────────────────────────────────

    async def analyze(
        self,
        image_b64: str,
        question: Optional[str] = None,
        session_id: Optional[str] = None,
        authenticity_context: Optional[str] = None,
        safety_context: Optional[str] = None,
    ) -> AnalysisResult:
        """
        Analyze a real-world image using Sarvam AI multimodal completion.
        """
        if not self._api_key:
            raise ValueError(
                "Sarvam API key (SARVAM_API_KEY) is not configured in backend/.env. "
                "Please configure a valid SARVAM_API_KEY or set AI_MODE=mock."
            )

        if not image_b64 or len(image_b64) < 10:
            raise ValueError("Invalid or empty image data provided.")

        data_url = _ensure_data_url(image_b64)

        user_prompt_text = (
            question.strip()
            if question and question.strip()
            else "Inspect what is shown in this image. Diagnose the condition and provide action steps."
        )

        # Domain-aware RAG Retrieval: Only retrieve documents relevant to detected domain
        from app.services.domain_detector import detect_domain
        detected_domain = detect_domain("", question or "")
        retrieved_chunks = []
        if detected_domain in ("ELECTRONICS", "MECHANICAL", "HVAC", "NETWORK") and question and question.strip():
            try:
                from app.services.rag_service import get_rag_service

                rag = get_rag_service()
                retrieved_chunks = await rag.retrieve(
                    question.strip(),
                    top_k=2,
                    domain=detected_domain,
                    min_relevance_threshold=0.25,
                )
            except Exception as rag_err:
                logger.warning("RAG retrieval failed during Sarvam analyze: %s", rag_err)

        rag_prompt_section = _format_rag_context(retrieved_chunks)
        grounding_sources = list(dict.fromkeys(c.source for c in retrieved_chunks))
        if not grounding_sources:
            grounding_sources = ["VISUAL ANALYSIS"]

        prompt_parts = []
        if safety_context:
            prompt_parts.append(safety_context)
        if authenticity_context:
            prompt_parts.append(authenticity_context)
        if rag_prompt_section:
            prompt_parts.append(rag_prompt_section)
        prompt_parts.append(user_prompt_text)
        final_prompt_text = "\n\n".join(prompt_parts)

        # Check if model supports multimodal message format or text-only
        if self._model.lower() in ("sarvam-105b", "sarvam-105b-conversations"):
            # Text-only model: pass prompt instructions
            user_content: Any = f"[Image Attached: Base64 data provided]\n\n{final_prompt_text}"
        else:
            # Multimodal (e.g. gemma4, glm5.3, etc.)
            user_content = [
                {
                    "type": "image_url",
                    "image_url": {"url": data_url},
                },
                {
                    "type": "text",
                    "text": final_prompt_text,
                },
            ]

        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": SARVAM_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            "temperature": 0.2,
        }

        logger.info(
            "Calling Sarvam AI (%s) via %s/chat/completions (RAG sources: %s)...",
            self._model,
            self._base_url,
            grounding_sources,
        )

        endpoint = f"{self._base_url}/chat/completions"
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                resp = await client.post(endpoint, json=payload, headers=self._get_headers())
                if resp.status_code != 200:
                    self._handle_http_error(resp)

                data = resp.json()
                raw_text = ""
                choices = data.get("choices", [])
                if choices and choices[0].get("message"):
                    raw_text = choices[0]["message"].get("content") or ""

                if not raw_text:
                    raise ValueError("Sarvam AI returned an empty response.")

        except Exception as exc:
            self._handle_api_error(exc)

        # Parse and validate the response
        result = self._parse_analysis_response(raw_text)
        result.grounding_sources = grounding_sources

        # Determine domain and mode
        from app.services.domain_detector import detect_domain

        detected_domain = detect_domain(result.what_i_see, user_prompt_text)

        session_context = {
            "mode": "GENERAL_ANALYSIS",
            "domain": detected_domain,
            "image_b64": image_b64,
            "image_context": result.what_i_see,
            "question": user_prompt_text,
            "analysis": result,
            "history": [
                {"role": "user", "content": user_prompt_text},
                {"role": "assistant", "content": f"{result.what_i_see}\n{result.next_action}"},
            ],
        }
        if session_id:
            from app.services.session_manager import get_session_manager
            get_session_manager().set_session(session_id, session_context)
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
        Answer a follow-up question strictly grounded in the inspected image and current question.
        Ensures plant and general analysis conversations are not contaminated by electronics RAG/hypotheses.
        """
        if not self._api_key:
            raise ValueError(
                "Sarvam API key (SARVAM_API_KEY) is not configured in backend/.env. "
                "Please configure a valid SARVAM_API_KEY or set AI_MODE=mock."
            )

        if not question or not question.strip():
            raise ValueError("Question must not be empty.")

        from app.services.session_manager import get_session_manager
        from app.services.domain_detector import detect_domain

        ctx = get_session_manager().get_session(session_id)
        if ctx is None and session_id in self._sessions:
            ctx = self._sessions.get(session_id)

        prior: Optional[AnalysisResult] = ctx.get("analysis") if ctx else None
        image_b64: Optional[str] = ctx.get("image_b64") if ctx else None
        mode = ctx.get("mode", "GENERAL_ANALYSIS") if ctx else "GENERAL_ANALYSIS"

        what_i_see = prior.what_i_see if prior else ""
        initial_q = ctx.get("question", "") if ctx else ""
        domain = ctx.get("domain") or detect_domain(what_i_see, initial_q, question)

        context_summary = ""
        if prior:
            context_summary = (
                f"CURRENT INSPECTED OBJECT UNDERSTANDING:\n"
                f"- What was identified in image: {prior.what_i_see}\n"
                f"- Current condition / status: {prior.what_is_happening}\n"
                f"- Recommended next action: {prior.next_action}\n"
                f"- Initial steps: {', '.join(prior.steps)}\n"
                f"- Safety advice: {prior.safety_warning or 'None'}\n"
            )

        # Domain-aware RAG retrieval with strict relevance threshold
        retrieved_chunks = []
        try:
            from app.services.rag_service import get_rag_service

            rag = get_rag_service()
            retrieved_chunks = await rag.retrieve(
                question.strip(),
                top_k=3,
                domain=domain,
                min_relevance_threshold=0.25,
            )
        except Exception as rag_err:
            logger.warning("RAG retrieval failed during Sarvam follow-up: %s", rag_err)

        rag_prompt_section = _format_rag_context(retrieved_chunks)
        if retrieved_chunks:
            grounding_sources = list(dict.fromkeys(c.source for c in retrieved_chunks))
        else:
            grounding_sources = ["VISUAL ANALYSIS"]

        # Follow-up prompt adhering to Section 7 of instructions
        system_prompt = (
            f"You are REALITY → ACTION AI, answering a follow-up question about an ongoing visual inspection.\n"
            f"CURRENT MODE: {mode}\n"
            f"CURRENT DOMAIN: {domain}\n\n"
            f"CRITICAL GROUNDING & SAFETY RULES:\n"
            f"1. Answer strictly based on the inspected reality, the current image, and prior observations.\n"
            f"2. Keep the answer strictly grounded in the detected domain ({domain}).\n"
            f"3. Do NOT assume electronics, pulleys, capacitor discharge, or motor drives unless the inspected object is genuinely an electronic or mechanical component.\n"
            f"4. DOMAIN SWITCH / UNRELATED OBJECT PROTECTION: If the user asks about an object or component not present in the inspected image (e.g., asking about a capacitor when the image is a plant), explicitly clarify that the current inspection is of a {domain} ({what_i_see or 'current subject'}) and does not contain that component, rather than hallucinating testing procedures for a non-existent component.\n"
            f"5. If no technical knowledge references are provided or relevant, rely on visual inspection and general domain knowledge.\n"
            f"6. Do not hallucinate or contradict previous observations.\n\n"
            f"OUTPUT FORMAT:\n"
            f"You MUST respond with valid JSON:\n"
            f"{{\n"
            f'  "answer": "Clear, direct, and actionable answer grounded in the current image and question.",\n'
            f'  "steps": ["Optional step 1", "Optional step 2"] or null,\n'
            f'  "confidence": 0.85,\n'
            f'  "safety_warning": "Safety advice if applicable, or null."\n'
            f"}}\n"
            f"Do NOT include any text outside the JSON object."
        )

        user_content_parts = []
        if context_summary:
            user_content_parts.append(context_summary)
        if rag_prompt_section:
            user_content_parts.append(rag_prompt_section)
        else:
            user_content_parts.append(
                f"RELEVANT TECHNICAL REFERENCES:\nNone ({'Visual Analysis' if domain == 'PLANT' else 'No high-confidence match'}). Rely on visual reality and {domain.lower()} domain principles."
            )

        history = ctx.get("history", []) if ctx else []
        if len(history) > 2:
            hist_lines = []
            for item in history[-4:]:
                role = "User" if item.get("role") == "user" else "Assistant"
                hist_lines.append(f"{role}: {item.get('content')}")
            user_content_parts.append("PREVIOUS CONVERSATION CONTEXT:\n" + "\n".join(hist_lines))

        user_content_parts.append(f"FOLLOW-UP QUESTION:\n{question.strip()}")
        user_text = "\n\n".join(user_content_parts)

        # Build payload with multimodal support when image_b64 is present
        if image_b64 and self._model.lower() not in ("sarvam-105b", "sarvam-105b-conversations"):
            data_url = _ensure_data_url(image_b64)
            user_msg_content: Any = [
                {"type": "image_url", "image_url": {"url": data_url}},
                {"type": "text", "text": user_text},
            ]
        else:
            user_msg_content = user_text

        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_msg_content},
            ],
            "temperature": 0.2,
        }

        logger.info(
            "Calling Sarvam AI follow-up for session %s (domain: %s, RAG sources: %s)...",
            session_id,
            domain,
            grounding_sources,
        )

        endpoint = f"{self._base_url}/chat/completions"
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                resp = await client.post(endpoint, json=payload, headers=self._get_headers())
                if resp.status_code != 200:
                    self._handle_http_error(resp)

                data = resp.json()
                raw_text = ""
                choices = data.get("choices", [])
                if choices and choices[0].get("message"):
                    raw_text = choices[0]["message"].get("content") or ""

                if not raw_text:
                    raise ValueError("Sarvam returned an empty follow-up response.")

        except Exception as exc:
            self._handle_api_error(exc)

        result = self._parse_follow_up_response(raw_text)
        result.grounding_sources = grounding_sources

        # Preserve conversation context in session
        if ctx:
            if "history" not in ctx:
                ctx["history"] = []
            ctx["history"].append({"role": "user", "content": question.strip()})
            ctx["history"].append({"role": "assistant", "content": result.answer})
            if session_id:
                get_session_manager().set_session(session_id, ctx)
                self._sessions[session_id] = ctx

        return result

    # ── Parsers ──────────────────────────────────────────────────────────────

    def _parse_analysis_response(self, raw_text: str) -> AnalysisResult:
        clean_text = _clean_json_str(raw_text)
        data: Dict[str, Any] = {}

        try:
            data = json.loads(clean_text)
        except Exception:
            logger.warning("JSON decode failed, attempting fallback regex parsing.")
            data = self._fallback_extract_analysis(raw_text)

        what_i_see = str(data.get("what_i_see") or "").strip()
        what_is_happening = str(data.get("what_is_happening") or "").strip()
        next_action = str(data.get("next_action") or "").strip()

        if not what_i_see or not what_is_happening or not next_action:
            raise ValueError(
                "Sarvam AI response did not contain required analysis fields. "
                "Please try again with a clearer image or question."
            )

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

        try:
            conf_val = float(data.get("confidence", 0.85))
            confidence = max(0.0, min(1.0, round(conf_val, 2)))
        except (ValueError, TypeError):
            confidence = 0.85

        raw_warning = data.get("safety_warning")
        safety_warning: Optional[str] = None
        if raw_warning and str(raw_warning).strip().lower() not in ("null", "none", ""):
            safety_warning = str(raw_warning).strip()

        # Parse visual faults
        visual_faults = _parse_visual_faults(data.get("visual_faults"))

        return AnalysisResult(
            what_i_see=what_i_see,
            what_is_happening=what_is_happening,
            next_action=next_action,
            steps=steps,
            confidence=confidence,
            safety_warning=safety_warning,
            visual_faults=visual_faults,
        )

    def _fallback_extract_analysis(self, text: str) -> Dict[str, Any]:
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

        steps_match = re.search(r'"steps"\s*:\s*\[([\s\S]*?)\]', text)
        if steps_match:
            items = re.findall(r'"([^"\\]*(?:\\.[^"\\]*)*)"', steps_match.group(1))
            if items:
                data["steps"] = [i.replace('\\"', '"') for i in items]

        conf_match = re.search(r'"confidence"\s*:\s*([0-9.]+)', text)
        if conf_match:
            data["confidence"] = float(conf_match.group(1))

        safety_match = re.search(r'"safety_warning"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', text)
        if safety_match:
            data["safety_warning"] = safety_match.group(1).replace('\\"', '"')

        return data

    def _parse_follow_up_response(self, raw_text: str) -> FollowUpResult:
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

    # ── Error Sanitizers ─────────────────────────────────────────────────────

    def _handle_http_error(self, resp: httpx.Response) -> None:
        logger.error("Sarvam API error response (%s): %s", resp.status_code, resp.text)
        if resp.status_code in (401, 403):
            raise ValueError(
                "Invalid or unauthorized Sarvam API key. "
                "Please verify the SARVAM_API_KEY configured in backend/.env."
            )
        if resp.status_code == 429:
            raise ValueError("Sarvam API rate limit reached. Please wait a few moments and try again.")
        if resp.status_code == 404:
            raise ValueError(f"Model '{self._model}' is not available on Sarvam API.")
        
        try:
            err_json = resp.json()
            msg = err_json.get("error", {}).get("message")
            if msg:
                raise ValueError(f"Sarvam API error: {msg}")
        except Exception:
            pass

        raise ValueError(f"Sarvam API error (status {resp.status_code}). Please try again later.")

    def _handle_api_error(self, exc: Exception) -> None:
        if isinstance(exc, ValueError):
            raise exc

        logger.error("Sarvam API request failed: %s", exc, exc_info=True)
        err_msg = str(exc).lower()

        if "timeout" in err_msg or "timed out" in err_msg:
            raise ValueError("Request to Sarvam AI timed out. Please check your network connection.")

        raise ValueError("An error occurred while contacting Sarvam AI. Please check backend logs or try again.")


# ── Service Singleton Factory ────────────────────────────────────────────────

_sarvam_service: Optional[SarvamService] = None


def get_sarvam_service() -> SarvamService:
    global _sarvam_service
    settings = get_settings()
    if (
        _sarvam_service is None
        or _sarvam_service._api_key != settings.sarvam_api_key
        or _sarvam_service._model != settings.sarvam_model
        or _sarvam_service._base_url != settings.sarvam_base_url
    ):
        _sarvam_service = SarvamService(
            api_key=settings.sarvam_api_key,
            model=settings.sarvam_model,
            base_url=settings.sarvam_base_url,
        )
    return _sarvam_service
