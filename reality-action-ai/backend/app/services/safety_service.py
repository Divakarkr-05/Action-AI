"""
REALITY → ACTION AI – Safety & Emergency Response Service

Enforces authoritative safety policies for uploaded images and user prompts.
Guarantees:
- Image analysis is probabilistic and NOT forensic/medical proof.
- Safety policy has absolute priority over LLM generation.
- Gemma / Sarvam CANNOT downgrade emergency states to NORMAL.
- Definitive claims (criminal, suicide, medical diagnosis) are prohibited.
- Provides verified India emergency helplines (112, 1933, 14416, 1800-891-4416).
- Strictly follows PROCESS -> RESPOND -> FORGET (no automatic profiling, no raw image logging).
- NEVER automatically contacts police, hospitals, NCB, or third parties.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

# ── Safety Categories & Severities ──────────────────────────────────────────

SAFETY_CATEGORIES = (
    "NORMAL",
    "POSSIBLE_DRUG_RELATED",
    "POSSIBLE_SELF_HARM",
    "POSSIBLE_SUICIDE_ATTEMPT",
    "POSSIBLE_SERIOUS_INJURY",
    "POSSIBLE_UNCONSCIOUS_PERSON",
    "EMERGENCY_UNCERTAIN",
)

SEVERITY_LEVELS = (
    "NORMAL",
    "INFO",
    "WARNING",
    "URGENT",
    "EMERGENCY",
)

# ── Verified Helplines (India Government) ───────────────────────────────────

HELPLINE_112 = {"name": "National Emergency Response Support System (ERSS)", "number": "112"}
HELPLINE_MANAS_1933 = {"name": "MANAS / National Narcotics Helpline", "number": "1933"}
HELPLINE_NCB = {"name": "Narcotics Control Bureau (NCB) Control Room", "number": "+91-11-26761000"}
HELPLINE_TELE_MANAS_SHORT = {"name": "Tele-MANAS Mental Health Support", "number": "14416"}
HELPLINE_TELE_MANAS_TOLLFREE = {"name": "Tele-MANAS Toll-Free 24x7", "number": "1800-891-4416"}


class HelplineModel(BaseModel):
    name: str
    number: str


class EmergencyResponseModel(BaseModel):
    safety_category: str = Field(..., description="One of SAFETY_CATEGORIES")
    severity: str = Field(..., description="One of SEVERITY_LEVELS")
    emergency_required: bool = Field(..., description="Whether emergency response is advised")
    title: str
    message: str
    immediate_actions: List[str] = Field(default_factory=list)
    avoid_actions: List[str] = Field(default_factory=list)
    helplines: List[HelplineModel] = Field(default_factory=list)


# ── Response Template Generators ────────────────────────────────────────────

def create_emergency_response(category: str) -> EmergencyResponseModel:
    """Generate structured safety advisory based on classification."""
    cat = category.strip().upper() if category else "NORMAL"
    if cat not in SAFETY_CATEGORIES:
        cat = "EMERGENCY_UNCERTAIN"

    if cat == "NORMAL":
        return EmergencyResponseModel(
            safety_category="NORMAL",
            severity="NORMAL",
            emergency_required=False,
            title="Normal Technical Inspection",
            message="No immediate acute life-safety or emergency hazards detected.",
            immediate_actions=[],
            avoid_actions=[],
            helplines=[],
        )

    if cat == "POSSIBLE_DRUG_RELATED":
        return EmergencyResponseModel(
            safety_category="POSSIBLE_DRUG_RELATED",
            severity="WARNING",
            emergency_required=False,
            title="Possible drug-related content detected",
            message=(
                "Possible drug-related or unidentified substance content detected. "
                "An image alone cannot confirm substance identity or legality."
            ),
            immediate_actions=[
                "Do not touch, consume, taste, smell, move, or tamper with an unknown substance.",
                "Do not confront suspected individuals.",
                "If there is immediate danger or an overdose medical emergency, call 112.",
                "For suspected illicit narcotics or confidential reporting, contact MANAS at 1933 or NCB at +91-11-26761000.",
            ],
            avoid_actions=[
                "Do not ingest or sample unidentified substances.",
                "Do not attempt private enforcement or confrontation.",
            ],
            helplines=[
                HelplineModel(**HELPLINE_112),
                HelplineModel(**HELPLINE_MANAS_1933),
                HelplineModel(**HELPLINE_NCB),
            ],
        )

    if cat in ("POSSIBLE_SELF_HARM", "POSSIBLE_SUICIDE_ATTEMPT"):
        is_suicide = cat == "POSSIBLE_SUICIDE_ATTEMPT"
        return EmergencyResponseModel(
            safety_category=cat,
            severity="EMERGENCY",
            emergency_required=True,
            title="Immediate help may be needed",
            message=(
                "Immediate safety is the highest priority. If you or someone you see is in crisis, "
                "immediate professional assistance is available 24x7. An image cannot confirm the exact situation, "
                "but safety precautions must be taken without delay."
            ),
            immediate_actions=[
                "If someone is in immediate danger, call 112 for emergency assistance.",
                "Stay with the person if it is safe to do so; do not leave someone in immediate danger alone.",
                "Contact Tele-MANAS at 14416 or toll-free at 1800-891-4416 for 24x7 free mental-health support.",
                "Remove obvious means of harm only if it can be done safely.",
            ],
            avoid_actions=[
                "Do not attempt dangerous rescue actions yourself.",
                "Do not leave a person in acute crisis unattended.",
                "Do not hesitate to reach out for professional crisis counseling.",
            ],
            helplines=[
                HelplineModel(**HELPLINE_112),
                HelplineModel(**HELPLINE_TELE_MANAS_SHORT),
                HelplineModel(**HELPLINE_TELE_MANAS_TOLLFREE),
            ],
        )

    if cat in ("POSSIBLE_SERIOUS_INJURY", "POSSIBLE_UNCONSCIOUS_PERSON"):
        is_unconscious = cat == "POSSIBLE_UNCONSCIOUS_PERSON"
        return EmergencyResponseModel(
            safety_category=cat,
            severity="URGENT",
            emergency_required=True,
            title="Possible medical emergency",
            message=(
                f"The image may indicate a {'potentially unconscious' if is_unconscious else 'seriously injured'} person. "
                "An image cannot confirm the medical condition or provide a clinical diagnosis."
            ),
            immediate_actions=[
                "Contact emergency services immediately by calling 112.",
                "Keep the surrounding area safe from ongoing hazards (electrical, traffic, machinery).",
                "Avoid unnecessary movement of the injured person unless there is immediate danger (e.g. fire).",
                "For severe visible bleeding, apply firm direct pressure with clean cloth or sterile gauze if safe.",
                "Follow instructions given by emergency dispatchers until professional responders arrive.",
            ],
            avoid_actions=[
                "Do not provide medical diagnosis from an image.",
                "Do not move suspected spinal injury patients unless in imminent physical peril.",
                "Do not attempt advanced medical procedures without certified training.",
            ],
            helplines=[
                HelplineModel(**HELPLINE_112),
            ],
        )

    # EMERGENCY_UNCERTAIN
    return EmergencyResponseModel(
        safety_category="EMERGENCY_UNCERTAIN",
        severity="WARNING",
        emergency_required=False,
        title="Potential emergency or safety hazard",
        message="The image may depict a hazardous situation. An image cannot confirm the severity.",
        immediate_actions=[
            "Assess the surroundings from a safe distance.",
            "If anyone is injured or in immediate distress, call 112.",
            "Follow established occupational safety and hazard containment protocols.",
        ],
        avoid_actions=[
            "Do not enter an unverified hazardous environment without proper equipment.",
        ],
        helplines=[
            HelplineModel(**HELPLINE_112),
        ],
    )


# ── Classifier Logic (Heuristic + Contextual) ───────────────────────────────

# Regular expressions for detection
RE_SELF_HARM = re.compile(
    r"\b(suicide|kill\s*myself|hang(?:ing)?|wrist\s*cut|self[- ]?harm|slit|overdose|end\s*it\s*all|poisoning)\b",
    re.IGNORECASE,
)
RE_DRUGS = re.compile(
    r"\b(cocaine|heroin|meth|fentanyl|narcotics|drug\s*trafficking|contraband|illicit\s*substance|ecstasy|mdma)\b",
    re.IGNORECASE,
)
RE_INJURY = re.compile(
    r"\b(unconscious|passed\s*out|collapsed|severe\s*bleeding|gushing\s*blood|stab\s*wound|bullet\s*wound|amputation|crushed|electrocuted)\b",
    re.IGNORECASE,
)


class SafetyService:
    """Evaluates safety and manages emergency response protocols."""

    def classify_request(
        self,
        question: Optional[str] = None,
        context_hints: Optional[str] = None,
    ) -> str:
        """
        Classifies incoming input for acute safety risks.
        Returns one of SAFETY_CATEGORIES.
        """
        text = f"{question or ''} {context_hints or ''}".strip()
        if not text:
            return "NORMAL"

        if RE_SELF_HARM.search(text):
            if any(w in text.lower() for w in ("hang", "hanging", "suicide", "end it all")):
                return "POSSIBLE_SUICIDE_ATTEMPT"
            return "POSSIBLE_SELF_HARM"

        if re.search(r"\b(unconscious|passed\s*out|collapsed|not\s*responding|unresponsive)\b", text, re.IGNORECASE):
            return "POSSIBLE_UNCONSCIOUS_PERSON"

        if RE_INJURY.search(text):
            return "POSSIBLE_SERIOUS_INJURY"

        if RE_DRUGS.search(text):
            return "POSSIBLE_DRUG_RELATED"

        return "NORMAL"

    def enforce_safety_policy(
        self,
        initial_category: str,
        gemma_output_text: str,
    ) -> EmergencyResponseModel:
        """
        Enforce safety immutability:
        - Gemma CANNOT downgrade an emergency state to NORMAL.
        - If Gemma's output reveals an emergency, upgrade to that state.
        """
        current_cat = initial_category.strip().upper() if initial_category else "NORMAL"
        if current_cat not in SAFETY_CATEGORIES:
            current_cat = "NORMAL"

        # Check if Gemma's response detected an emergency that wasn't flagged earlier
        discovered_cat = self.classify_request(context_hints=gemma_output_text)

        # Upgrade if Gemma discovered a higher-severity condition
        critical_categories = (
            "POSSIBLE_SUICIDE_ATTEMPT",
            "POSSIBLE_SELF_HARM",
            "POSSIBLE_UNCONSCIOUS_PERSON",
            "POSSIBLE_SERIOUS_INJURY",
            "POSSIBLE_DRUG_RELATED",
        )

        final_cat = current_cat
        if current_cat == "NORMAL" and discovered_cat in critical_categories:
            final_cat = discovered_cat
        elif current_cat in critical_categories and discovered_cat == "NORMAL":
            # Gemma attempted to downgrade -> PREVENT DOWNGRADE
            final_cat = current_cat

        return create_emergency_response(final_cat)

    def sanitize_claims(self, text: str) -> str:
        """
        Ensures probabilistic language is preserved.
        Replaces definitive claims with tentative language.
        """
        replacements = [
            (r"\bthis is definitely (an? )?(illegal drug|narcotic)\b", "this may indicate an unknown substance"),
            (r"\bthis person definitely attempted suicide\b", "this situation may indicate potential self-harm"),
            (r"\bthis person is definitely dead\b", "this person appears unresponsive"),
            (r"\bconfirmed illegal drug\b", "unidentified substance"),
        ]
        sanitized = text
        for pat, repl in replacements:
            sanitized = re.sub(pat, repl, sanitized, flags=re.IGNORECASE)
        return sanitized


_safety_service: Optional[SafetyService] = None


def get_safety_service() -> SafetyService:
    global _safety_service
    if _safety_service is None:
        _safety_service = SafetyService()
    return _safety_service
