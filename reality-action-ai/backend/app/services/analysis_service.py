"""
REALITY → ACTION AI – Mock Analysis Service

This service returns deterministic mock data so the full application stack
can be developed and tested end-to-end before real Gemma 4 integration.

REPLACEMENT PLAN:
  When HF_TOKEN is configured and AI_MODE=gemma, swap this for
  GemmaService (app/services/gemma_service.py) which calls
  google/gemma-4-31B-it via Hugging Face Inference API.

  The interface contract (AnalysisResult / FollowUpResult) must remain
  identical so the GraphQL layer never needs to change.
"""

from __future__ import annotations

import asyncio
import random
from typing import List, Optional, Union, TYPE_CHECKING

from app.schemas.models import AnalysisResult, FollowUpResult

if TYPE_CHECKING:
    from app.services.gemma_service import GemmaService
    from app.services.sarvam_service import SarvamService


# ─── Mock response pool ──────────────────────────────────────────────────────

_MOCK_RESPONSES: List[dict] = [
    {
        "what_i_see": (
            "A printed circuit board (PCB) with several surface-mount components, "
            "including what appears to be capacitors, resistors, and an integrated circuit chip."
        ),
        "what_is_happening": (
            "One of the capacitors near the top-right corner shows signs of electrolytic leakage — "
            "a brownish residue is visible around its base. This often indicates component failure "
            "caused by overvoltage or excessive heat."
        ),
        "next_action": "Disconnect power immediately and do not operate this circuit until the faulty capacitor is replaced.",
        "steps": [
            "Disconnect all power sources from the circuit.",
            "Visually confirm which capacitor is leaking (look for bulging or discolouration).",
            "Discharge any remaining capacitors safely using a resistor.",
            "Desolder the faulty capacitor with appropriate tools.",
            "Install a replacement capacitor with matching voltage and capacitance ratings.",
            "Inspect surrounding components for heat or corrosion damage.",
            "Reconnect power and verify functionality with a multimeter before normal use.",
        ],
        "confidence": 0.87,
        "safety_warning": (
            "ELECTRICAL HAZARD — Capacitors can retain dangerous charge even after power is disconnected. "
            "Always discharge before touching."
        ),
        "visual_faults": [
            {
                "id": "fault_1",
                "component_label": "C12 (Electrolytic Capacitor)",
                "description": "Bulging vent and electrolyte leakage residue at component base",
                "severity": "CRITICAL",
                "ymin": 0.18,
                "xmin": 0.65,
                "ymax": 0.42,
                "xmax": 0.88,
            },
            {
                "id": "fault_2",
                "component_label": "R8 (SMD Resistor)",
                "description": "Mild thermal discolouration on solder fillet",
                "severity": "INFO",
                "ymin": 0.52,
                "xmin": 0.58,
                "ymax": 0.64,
                "xmax": 0.72,
            },
        ],
    },
    {
        "what_i_see": (
            "A mechanical assembly showing what appears to be a belt-driven pulley system "
            "with two pulleys and a worn drive belt."
        ),
        "what_is_happening": (
            "The drive belt shows visible cracking and fraying on its inner surface, "
            "indicating significant wear. Continued operation risks belt failure and potential mechanical damage."
        ),
        "next_action": "Stop the machine and replace the drive belt before next use.",
        "steps": [
            "Power off and lock out the machine.",
            "Note the belt routing path before removal.",
            "Release belt tension by adjusting the tensioner pulley.",
            "Remove the old belt and inspect pulleys for wear or damage.",
            "Install a replacement belt of the correct specification.",
            "Re-tension the belt to the manufacturer's specification.",
            "Run the machine briefly and check for correct tracking.",
        ],
        "confidence": 0.91,
        "safety_warning": (
            "MECHANICAL HAZARD — Ensure the machine is fully powered off and locked out before servicing. "
            "Never service a running belt drive."
        ),
        "visual_faults": [
            {
                "id": "fault_1",
                "component_label": "Primary Drive Belt",
                "description": "Visible cracking and edge fraying along tension segment",
                "severity": "WARNING",
                "ymin": 0.32,
                "xmin": 0.22,
                "ymax": 0.68,
                "xmax": 0.78,
            }
        ],
    },
    {
        "what_i_see": (
            "A network patch panel with multiple RJ-45 ports. Several cables are connected, "
            "and two ports show visible damage or incorrect cable seating."
        ),
        "what_is_happening": (
            "Two cables appear unseated or incorrectly terminated. "
            "This is consistent with intermittent connectivity issues on those lines."
        ),
        "next_action": "Re-seat or re-terminate the affected cables using a punch-down tool.",
        "steps": [
            "Identify the affected ports using a cable tester.",
            "Label each cable before disconnecting to preserve documentation.",
            "Unplug each affected cable from its port.",
            "Inspect the RJ-45 connector and port pins for damage.",
            "Re-terminate if necessary using a punch-down tool.",
            "Re-seat cables firmly and verify with a cable continuity tester.",
            "Update network documentation if port assignments changed.",
        ],
        "confidence": 0.79,
        "safety_warning": None,
        "visual_faults": [
            {
                "id": "fault_1",
                "component_label": "Port 5 & Port 6 Modular Jacks",
                "description": "Dislodged RJ-45 boot and broken retention clip",
                "severity": "WARNING",
                "ymin": 0.38,
                "xmin": 0.35,
                "ymax": 0.58,
                "xmax": 0.62,
            }
        ],
    },
    {
        "what_i_see": (
            "An HVAC unit control panel with a digital display showing an error code (E03) "
            "and a flashing status LED."
        ),
        "what_is_happening": (
            "Error code E03 on this type of unit typically indicates a refrigerant pressure fault "
            "or a blocked condenser filter. The system has entered a protection mode to prevent compressor damage."
        ),
        "next_action": "Check and clean the air filter, then reset the unit. If the error persists, call a certified HVAC technician.",
        "steps": [
            "Power off the unit using the main switch.",
            "Locate and remove the air filter panel.",
            "Inspect the filter — clean or replace if blocked.",
            "Check that the condenser coils are free of debris.",
            "Power the unit back on and wait 2 minutes for initialisation.",
            "If E03 reappears, do not attempt further repairs — contact a certified technician.",
        ],
        "confidence": 0.74,
        "safety_warning": (
            "REFRIGERANT WARNING — Do not attempt to access refrigerant lines or the compressor unit. "
            "This requires a licensed technician."
        ),
        "visual_faults": [
            {
                "id": "fault_1",
                "component_label": "Status Display & Alarm LED",
                "description": "Lockout code E03 active with flashing warning indicator",
                "severity": "WARNING",
                "ymin": 0.25,
                "xmin": 0.40,
                "ymax": 0.50,
                "xmax": 0.65,
            }
        ],
    },
]

_FOLLOW_UP_RESPONSES: List[str] = [
    "Based on what I observed, you should focus on the area I highlighted first. "
    "Start with a visual check before using any tools.",
    "That's a good question. The most important thing is to ensure safety first — "
    "make sure the device is powered off before proceeding.",
    "Yes, inspecting that connection is the right next step. "
    "Look carefully for signs of corrosion, cracking, or discolouration.",
    "If you are unsure about any step, stop and consult the manufacturer's documentation "
    "or a qualified professional. Do not guess with electrical or mechanical systems.",
    "That component typically needs replacement rather than repair. "
    "Check the part number visible on the component and source an exact replacement.",
]


# ─── Service ─────────────────────────────────────────────────────────────────

class MockAnalysisService:
    """
    Returns structured mock analysis data.

    Replace this class with GemmaService when HF_TOKEN is available.
    The public interface (analyze / ask_follow_up) must remain identical.
    """

    async def analyze(
        self,
        image_b64: str,   # noqa: ARG002 – will be consumed by real service
        question: Optional[str] = None,
        session_id: Optional[str] = None,  # noqa: ARG002
        authenticity_context: Optional[str] = None,  # noqa: ARG002
        safety_context: Optional[str] = None,  # noqa: ARG002
    ) -> AnalysisResult:
        # Simulate a short AI processing delay
        await asyncio.sleep(random.uniform(1.2, 2.5))
        mock = dict(random.choice(_MOCK_RESPONSES))

        # Retrieve grounding sources based on user question or default context
        retrieval_query = (
            question.strip()
            if question and question.strip()
            else "electrical safety mechanical belt capacitor hvac network troubleshooting"
        )
        grounding_sources = []
        try:
            from app.services.rag_service import get_rag_service

            rag = get_rag_service()
            chunks = await rag.retrieve(retrieval_query, top_k=2)
            grounding_sources = list(dict.fromkeys(c.source for c in chunks))
        except Exception:
            pass

        mock["grounding_sources"] = grounding_sources
        res_obj = AnalysisResult(**mock)
        if session_id:
            from app.services.session_manager import get_session_manager
            from app.services.domain_detector import detect_domain

            domain = detect_domain(res_obj.what_i_see, question or "")
            get_session_manager().set_session(
                session_id,
                {
                    "mode": "GENERAL_ANALYSIS",
                    "domain": domain,
                    "analysis": res_obj,
                    "image_b64": image_b64,
                    "question": question,
                    "history": [
                        {"role": "user", "content": question or ""},
                        {"role": "assistant", "content": f"{res_obj.what_i_see}\n{res_obj.next_action}"},
                    ],
                },
            )
        return res_obj

    async def ask_follow_up(
        self,
        session_id: str,
        question: str,
    ) -> FollowUpResult:
        await asyncio.sleep(random.uniform(0.1, 0.4))

        from app.services.session_manager import get_session_manager
        from app.services.domain_detector import detect_domain

        ctx = get_session_manager().get_session(session_id)
        prior = ctx.get("analysis") if ctx else None
        what_i_see = prior.what_i_see if prior else ""
        initial_q = ctx.get("question", "") if ctx else ""
        domain = (ctx.get("domain") if ctx else None) or detect_domain(what_i_see, initial_q, question)

        grounding_sources = []
        try:
            from app.services.rag_service import get_rag_service

            rag = get_rag_service()
            chunks = await rag.retrieve(
                question.strip(),
                top_k=2,
                domain=domain,
                min_relevance_threshold=0.25,
            )
            if chunks:
                grounding_sources = list(dict.fromkeys(c.source for c in chunks))
            else:
                grounding_sources = ["VISUAL ANALYSIS"]
        except Exception:
            grounding_sources = ["VISUAL ANALYSIS"]

        if domain == "PLANT":
            q_lower = question.lower()
            if any(term in q_lower for term in ("capacitor", "circuit", "multimeter", "voltage", "solder")):
                answer = (
                    f"The current visual inspection is of a plant ({what_i_see or 'houseplant'}). "
                    "There are no capacitors or electrical components present in this subject. "
                    "If you are troubleshooting an electronic device, please upload a photo of that component."
                )
            elif "tool" in q_lower:
                answer = (
                    "For plant care and maintenance, you typically need clean pruning shears, "
                    "a well-draining pot with fresh potting soil, a watering can, and optionally a moisture meter."
                )
            else:
                answer = f"Based on the inspected plant ({what_i_see or 'plant'}), ensure proper indirect sunlight, regular watering when the top inch of soil is dry, and adequate pot drainage."
        elif domain == "MECHANICAL":
            answer = "For belt and pulley inspection, check alignment with a straightedge and verify deflection tension according to manufacturer specifications."
        else:
            answer = random.choice(_FOLLOW_UP_RESPONSES)

        if ctx:
            if "history" not in ctx:
                ctx["history"] = []
            ctx["history"].append({"role": "user", "content": question.strip()})
            ctx["history"].append({"role": "assistant", "content": answer})

        return FollowUpResult(
            answer=answer,
            steps=None,
            confidence=round(random.uniform(0.75, 0.92), 2),
            safety_warning=None,
            grounding_sources=grounding_sources,
        )


# ─── Factory ─────────────────────────────────────────────────────────────────

_mock_service: Optional[MockAnalysisService] = None


def get_mock_analysis_service() -> MockAnalysisService:
    global _mock_service
    if _mock_service is None:
        _mock_service = MockAnalysisService()
    return _mock_service


def get_analysis_service() -> Union[GemmaService, SarvamService, MockAnalysisService]:
    """
    Dependency-injected service factory.

    Returns:
      - SarvamService when AI_MODE=sarvam
      - GemmaService when AI_MODE=gemma
      - MockAnalysisService otherwise
    """
    from app.config.settings import get_settings

    settings = get_settings()
    mode = settings.ai_mode.strip().lower()

    if mode == "sarvam":
        from app.services.sarvam_service import get_sarvam_service
        return get_sarvam_service()

    if mode == "gemma":
        from app.services.gemma_service import get_gemma_service
        return get_gemma_service()

    return get_mock_analysis_service()

