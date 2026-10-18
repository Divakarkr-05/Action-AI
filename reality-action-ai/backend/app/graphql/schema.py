"""
REALITY → ACTION AI – Strawberry GraphQL Schema Types

All strawberry type definitions live here.
Queries and mutations import from this module.
"""

from __future__ import annotations

from typing import List, Optional
import strawberry
from datetime import datetime


@strawberry.type
class AnalysisResultType:
    """Full AI analysis of an uploaded image."""

    what_i_see: str
    what_is_happening: str
    next_action: str
    steps: List[str]
    confidence: float
    safety_warning: Optional[str] = None
    grounding_sources: Optional[List[str]] = None
    image_authenticity: Optional[str] = None
    ai_generated_probability: Optional[float] = None
    authenticity_confidence: Optional[float] = None
    authenticity_model: Optional[str] = None
    authenticity_indicators: Optional[List[str]] = None


@strawberry.type
class FollowUpResultType:
    """Response to a follow-up question in an analysis session."""

    answer: str
    steps: Optional[List[str]] = None
    confidence: float
    safety_warning: Optional[str] = None
    grounding_sources: Optional[List[str]] = None


@strawberry.type
class HealthType:
    """Basic health check response."""

    status: str
    version: str
    ai_mode: str
    model: str


@strawberry.type
class AnalysisHistoryItemType:
    """A single item from the user's analysis history."""

    id: str
    question: Optional[str] = None
    what_i_see: Optional[str] = None
    what_is_happening: Optional[str] = None
    next_action: Optional[str] = None
    steps: Optional[List[str]] = None
    confidence: Optional[float] = None
    safety_warning: Optional[str] = None
    image_url: Optional[str] = None
    created_at: Optional[str] = None
    image_authenticity: Optional[str] = None
    ai_generated_probability: Optional[float] = None
    authenticity_confidence: Optional[float] = None
    authenticity_model: Optional[str] = None
    authenticity_indicators: Optional[List[str]] = None


@strawberry.type
class SaveAnalysisResultType:
    """Result of saving an analysis to history."""

    success: bool
    history_id: Optional[str] = None
    message: Optional[str] = None


@strawberry.type
class DeleteAnalysisResultType:
    """Result of deleting an analysis from history."""

    success: bool
    message: Optional[str] = None

