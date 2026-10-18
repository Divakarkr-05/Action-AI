"""
REALITY → ACTION AI – Deterministic Diagnostic State Machine

Enforces strict, predictable state transitions for diagnostic cases.
CRITICAL RULE: The LLM NEVER arbitrarily dictates the state.
Business logic and evidence gating control the transitions.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Dict, List, Set
from uuid import uuid4

from app.diagnostic.models import (
    DiagnosticCase,
    DiagnosticEvent,
    DiagnosticState,
)

logger = logging.getLogger(__name__)

# Valid state transition graph
VALID_TRANSITIONS: Dict[DiagnosticState, Set[DiagnosticState]] = {
    "OBSERVE": {"IDENTIFY", "OBSERVE"},
    "IDENTIFY": {"HYPOTHESIZE", "OBSERVE"},
    "HYPOTHESIZE": {"SAFETY_CHECK", "OBSERVE"},
    "SAFETY_CHECK": {"TEST_TO_KNOW", "OBSERVE"},
    "TEST_TO_KNOW": {"AWAITING_TEST", "REPAIR", "SAFETY_CHECK", "OBSERVE"},
    "AWAITING_TEST": {"INTERPRET_RESULT", "TEST_TO_KNOW", "SAFETY_CHECK"},
    "INTERPRET_RESULT": {"NEXT_ACTION", "AWAITING_TEST"},
    "NEXT_ACTION": {"TEST_TO_KNOW", "REPAIR", "OBSERVE", "RESOLVED"},
    "REPAIR": {"VERIFY", "SAFETY_CHECK", "NEXT_ACTION"},
    "VERIFY": {"RESOLVED", "NEXT_ACTION", "REPAIR", "OBSERVE"},
    "RESOLVED": set(),  # Terminal state
}

# Heuristic progress weights per state
STATE_PROGRESS_MAP: Dict[DiagnosticState, float] = {
    "OBSERVE": 0.10,
    "IDENTIFY": 0.20,
    "HYPOTHESIZE": 0.35,
    "SAFETY_CHECK": 0.45,
    "TEST_TO_KNOW": 0.55,
    "AWAITING_TEST": 0.65,
    "INTERPRET_RESULT": 0.75,
    "NEXT_ACTION": 0.80,
    "REPAIR": 0.90,
    "VERIFY": 0.95,
    "RESOLVED": 1.00,
}


class DiagnosticStateMachine:
    """Manages legal transitions, progress tracking, and audit logging."""

    @staticmethod
    def can_transition(from_state: DiagnosticState, to_state: DiagnosticState) -> bool:
        """Check if transition is mathematically allowed by the directed graph."""
        if from_state == to_state:
            return True
        allowed = VALID_TRANSITIONS.get(from_state, set())
        return to_state in allowed

    @classmethod
    def transition(
        cls,
        case: DiagnosticCase,
        target_state: DiagnosticState,
        reason: str,
        payload: dict | None = None,
    ) -> DiagnosticCase:
        """
        Execute state transition on a case, appending an audit event.
        Raises ValueError if transition is illegal.
        """
        current = case.current_state

        if current != target_state and not cls.can_transition(current, target_state):
            err_msg = (
                f"Illegal diagnostic state transition: cannot transition from "
                f"'{current}' to '{target_state}'. Permitted next states: {VALID_TRANSITIONS.get(current, set())}"
            )
            logger.error(err_msg)
            raise ValueError(err_msg)

        old_state = case.current_state
        case.current_state = target_state
        case.updated_at = datetime.now(timezone.utc).isoformat()

        # Update investigation progress monotonically where applicable
        target_progress = STATE_PROGRESS_MAP.get(target_state, case.investigation_progress)
        case.investigation_progress = max(case.investigation_progress, target_progress)

        # Handle terminal resolution
        if target_state == "RESOLVED":
            case.status = "RESOLVED"
            case.resolved_at = datetime.now(timezone.utc).isoformat()
            case.investigation_progress = 1.0

        # Create audit event
        event = DiagnosticEvent(
            id=f"evt_{uuid4().hex[:8]}",
            event_type="STATE_TRANSITION",
            description=f"Transitioned from {old_state} to {target_state}: {reason}",
            timestamp=case.updated_at,
            payload={
                "from_state": old_state,
                "to_state": target_state,
                "reason": reason,
                **(payload or {}),
            },
        )
        case.events.append(event)
        logger.info(
            "Case %s transitioned: %s -> %s (Reason: %s)",
            case.id,
            old_state,
            target_state,
            reason,
        )
        return case
