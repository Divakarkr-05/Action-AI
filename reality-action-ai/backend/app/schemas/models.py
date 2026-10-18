"""
REALITY → ACTION AI – Pydantic schemas for internal data flow.

These are the domain models that travel between services.
GraphQL types (strawberry) live in app/graphql/schema.py.
"""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class Helpline(BaseModel):
    name: str
    number: str


class EmergencyResponse(BaseModel):
    safety_category: str
    severity: str
    emergency_required: bool
    title: str
    message: str
    immediate_actions: List[str] = Field(default_factory=list)
    avoid_actions: List[str] = Field(default_factory=list)
    helplines: List[Helpline] = Field(default_factory=list)


class VisualFault(BaseModel):
    """Pinpointed visual fault location and diagnosis with normalized spatial coordinates."""

    id: str = Field(..., description="Unique fault identifier, e.g. fault_1")
    component_label: str = Field(..., description="Suspected component or region, e.g. 'C12 (Electrolytic Capacitor)'")
    description: str = Field(..., description="Visual fault symptom, e.g. 'Bulging vent and electrolyte leakage at base'")
    severity: str = Field(default="WARNING", description="Severity level: CRITICAL | WARNING | INFO")
    ymin: float = Field(..., ge=0.0, le=1.0, description="Normalized top coordinate (0.0 to 1.0)")
    xmin: float = Field(..., ge=0.0, le=1.0, description="Normalized left coordinate (0.0 to 1.0)")
    ymax: float = Field(..., ge=0.0, le=1.0, description="Normalized bottom coordinate (0.0 to 1.0)")
    xmax: float = Field(..., ge=0.0, le=1.0, description="Normalized right coordinate (0.0 to 1.0)")


class AnalysisResult(BaseModel):
    """Structured output produced by the AI analysis service."""

    what_i_see: str = Field(..., description="A concise visual description of the image.")
    what_is_happening: str = Field(..., description="Inferred situation or problem.")
    next_action: str = Field(..., description="The single most important immediate action.")
    steps: List[str] = Field(..., description="Ordered list of actionable steps.")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence level 0–1.")
    safety_warning: Optional[str] = Field(
        None, description="Safety advisory, only present when relevant."
    )
    grounding_sources: Optional[List[str]] = Field(
        default_factory=list,
        description="Knowledge corpus source files retrieved and used for grounding.",
    )
    visual_faults: Optional[List[VisualFault]] = Field(
        default_factory=list,
        description="List of detected defective components or fault regions with spatial coordinates.",
    )
    image_authenticity: Optional[str] = Field(
        None, description="Authenticity classification (LIKELY_REAL, LIKELY_AI_GENERATED, UNCERTAIN, UNAVAILABLE)."
    )
    ai_generated_probability: Optional[float] = Field(
        None, ge=0.0, le=1.0, description="Estimated probability of image being AI-generated."
    )
    authenticity_confidence: Optional[float] = Field(
        None, ge=0.0, le=1.0, description="Confidence in authenticity classification."
    )
    authenticity_model: Optional[str] = Field(
        None, description="Model used for authenticity check (Detectra v3)."
    )
    authenticity_indicators: Optional[List[str]] = Field(
        default_factory=list, description="Authenticity indicators."
    )
    safety_category: Optional[str] = Field(
        default="NORMAL", description="Safety category classification."
    )
    emergency_response: Optional[EmergencyResponse] = Field(
        None, description="Structured emergency advisory when danger is detected."
    )


class AnalyzeInput(BaseModel):
    """Input for the analyzeReality mutation."""

    image_b64: str = Field(..., description="Base-64 encoded image data.")
    question: Optional[str] = Field(None, description="Optional user question.")
    image_authenticity: Optional[str] = Field(None)
    ai_generated_probability: Optional[float] = Field(None, ge=0.0, le=1.0)
    authenticity_confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    authenticity_model: Optional[str] = Field(None)
    authenticity_indicators: Optional[List[str]] = Field(default_factory=list)


class FollowUpResult(BaseModel):
    """Response to a follow-up question."""

    answer: str = Field(..., description="Answer to the follow-up question.")
    steps: Optional[List[str]] = Field(None, description="Additional steps if applicable.")
    confidence: float = Field(..., ge=0.0, le=1.0)
    safety_warning: Optional[str] = Field(None)
    grounding_sources: Optional[List[str]] = Field(
        default_factory=list,
        description="Knowledge corpus source files retrieved and used for grounding.",
    )


class ChatMessage(BaseModel):
    """A single message in the follow-up conversation."""

    role: str = Field(..., pattern="^(user|assistant)$")
    content: str
