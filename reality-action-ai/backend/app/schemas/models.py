"""
REALITY → ACTION AI – Pydantic schemas for internal data flow.

These are the domain models that travel between services.
GraphQL types (strawberry) live in app/graphql/schema.py.
"""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


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


class AnalyzeInput(BaseModel):
    """Input for the analyzeReality mutation."""

    image_b64: str = Field(..., description="Base-64 encoded image data.")
    question: Optional[str] = Field(None, description="Optional user question.")


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
