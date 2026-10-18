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
class HelplineType:
    name: str
    number: str


@strawberry.type
class EmergencyResponseType:
    safety_category: str
    severity: str
    emergency_required: bool
    title: str
    message: str
    immediate_actions: List[str]
    avoid_actions: List[str]
    helplines: List[HelplineType]


@strawberry.type
class VisualFaultType:
    id: str
    component_label: str
    description: str
    severity: str
    ymin: float
    xmin: float
    ymax: float
    xmax: float


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
    visual_faults: Optional[List[VisualFaultType]] = None
    image_authenticity: Optional[str] = None
    ai_generated_probability: Optional[float] = None
    authenticity_confidence: Optional[float] = None
    authenticity_model: Optional[str] = None
    authenticity_indicators: Optional[List[str]] = None
    safety_category: Optional[str] = None
    emergency_response: Optional[EmergencyResponseType] = None


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
    provider: str
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
    safety_category: Optional[str] = None


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


@strawberry.type
class ClearSessionResultType:
    """Result of purging a temporary session for Clear Conversation / New Private Session."""

    success: bool
    session_id: str
    message: str


# ── Diagnostic Intelligence Engine GraphQL Types ─────────────────────────────

@strawberry.type
class ImageQualityType:
    focus: str
    resolution: str
    glare: str
    lighting: str
    occlusion: str
    overall: str
    guidance: Optional[str] = None


@strawberry.type
class CameraCoachType:
    target: str
    reason: str
    where_to_point: str
    how_close: str
    what_angle: str
    lighting_requirement: str
    what_must_be_visible: List[str]


@strawberry.type
class EvidenceItemType:
    id: str
    claim: str
    evidence_type: str
    provenance: str
    source_reference: Optional[str] = None
    confidence: float


@strawberry.type
class IdentifiedComponentType:
    id: str
    reference_designator: str
    component_type: str
    package: Optional[str] = None
    marking: Optional[str] = None
    orientation: Optional[str] = None
    identity_confidence: float
    location_confidence: float
    defect_confidence: float


@strawberry.type
class FaultBoxType:
    id: str
    label: str
    component: str
    defect: str
    ymin: float
    xmin: float
    ymax: float
    xmax: float
    confidence: float
    severity: str
    location_type: str
    observed_evidence: List[str]
    inferred_interpretation: Optional[str] = None
    unknowns: List[str]
    recommended_inspection: Optional[str] = None


@strawberry.type
class ExpectedOutcomeType:
    condition: str
    interpretation: str


@strawberry.type
class DiagnosticTestType:
    id: str
    title: str
    objective: str
    hypothesis_ids: List[str]
    required_tools: List[str]
    prerequisites: List[str]
    safety_warnings: List[str]
    procedure: List[str]
    expected_outcomes: List[ExpectedOutcomeType]
    discriminating_power: float
    why_this_test: str


@strawberry.type
class HypothesisType:
    id: str
    title: str
    confidence: float
    status: str
    risk_level: str
    observed_evidence: List[str]
    supporting_evidence: List[str]
    disconfirming_evidence: List[str]
    recommended_test: Optional[str] = None
    affected_components: List[str]


@strawberry.type
class CounterfactualPredictionType:
    expected_visual_change: str
    expected_electrical_change: str
    unacceptable_outcomes: List[str]


@strawberry.type
class RepairPlanType:
    fault_id: str
    component_to_replace: str
    replacement_specs: str
    required_tools: List[str]
    prerequisites: List[str]
    safety_warnings: List[str]
    procedure_steps: List[str]
    counterfactual_prediction: CounterfactualPredictionType
    verification_method: str


@strawberry.type
class VerificationResultType:
    status: str
    visual_match_score: float
    detected_changes: List[str]
    missing_expected_changes: List[str]
    summary: str
    electrical_verification_required: bool


@strawberry.type
class ConfidenceTimelineEntryType:
    timestamp: str
    stage: str
    hypothesis_id: str
    confidence: float
    trigger_event: str


@strawberry.type
class DiagnosticEventType:
    id: str
    event_type: str
    description: str
    timestamp: str


@strawberry.type
class DiagnosticCaseType:
    """Full Diagnostic Case state for the closed-loop intelligence engine."""

    id: str
    user_id: str
    session_id: str
    title: str
    domain: str
    status: str
    current_state: str
    investigation_progress: float

    image_quality: Optional[ImageQualityType] = None
    camera_coach: Optional[CameraCoachType] = None

    evidence: List[EvidenceItemType]
    fault_boxes: List[FaultBoxType]
    identified_components: List[IdentifiedComponentType]
    hypotheses: List[HypothesisType]

    active_test: Optional[DiagnosticTestType] = None
    repair_plan: Optional[RepairPlanType] = None
    verification_result: Optional[VerificationResultType] = None

    confidence_timeline: List[ConfidenceTimelineEntryType]
    events: List[DiagnosticEventType]

    initial_image_url: Optional[str] = None
    latest_image_url: Optional[str] = None
    after_image_url: Optional[str] = None

    created_at: str
    updated_at: str
    expires_at: str
    resolved_at: Optional[str] = None


def case_model_to_graphql_type(case: Any) -> DiagnosticCaseType:
    """Helper to convert DiagnosticCase Pydantic model to GraphQL DiagnosticCaseType."""
    return DiagnosticCaseType(
        id=case.id,
        user_id=case.user_id,
        session_id=case.session_id,
        title=case.title,
        domain=case.domain,
        status=case.status,
        current_state=case.current_state,
        investigation_progress=case.investigation_progress,
        image_quality=(
            ImageQualityType(
                focus=case.image_quality.focus,
                resolution=case.image_quality.resolution,
                glare=case.image_quality.glare,
                lighting=case.image_quality.lighting,
                occlusion=case.image_quality.occlusion,
                overall=case.image_quality.overall,
                guidance=case.image_quality.guidance,
            )
            if case.image_quality
            else None
        ),
        camera_coach=(
            CameraCoachType(
                target=case.camera_coach.target,
                reason=case.camera_coach.reason,
                where_to_point=case.camera_coach.where_to_point,
                how_close=case.camera_coach.how_close,
                what_angle=case.camera_coach.what_angle,
                lighting_requirement=case.camera_coach.lighting_requirement,
                what_must_be_visible=case.camera_coach.what_must_be_visible,
            )
            if case.camera_coach
            else None
        ),
        evidence=[
            EvidenceItemType(
                id=e.id,
                claim=e.claim,
                evidence_type=e.evidence_type,
                provenance=e.provenance,
                source_reference=e.source_reference,
                confidence=e.confidence,
            )
            for e in (case.evidence or [])
        ],
        fault_boxes=[
            FaultBoxType(
                id=f.id,
                label=f.label,
                component=f.component,
                defect=f.defect,
                ymin=f.ymin,
                xmin=f.xmin,
                ymax=f.ymax,
                xmax=f.xmax,
                confidence=f.confidence,
                severity=f.severity,
                location_type=f.location_type,
                observed_evidence=f.observed_evidence or [],
                inferred_interpretation=f.inferred_interpretation,
                unknowns=f.unknowns or [],
                recommended_inspection=f.recommended_inspection,
            )
            for f in (case.fault_boxes or [])
        ],
        identified_components=[
            IdentifiedComponentType(
                id=c.id,
                reference_designator=c.reference_designator,
                component_type=c.component_type,
                package=c.package,
                marking=c.marking,
                orientation=c.orientation,
                identity_confidence=c.identity_confidence,
                location_confidence=c.location_confidence,
                defect_confidence=c.defect_confidence,
            )
            for c in (case.identified_components or [])
        ],
        hypotheses=[
            HypothesisType(
                id=h.id,
                title=h.title,
                confidence=h.confidence,
                status=h.status,
                risk_level=h.risk_level,
                observed_evidence=h.observed_evidence or [],
                supporting_evidence=h.supporting_evidence or [],
                disconfirming_evidence=h.disconfirming_evidence or [],
                recommended_test=h.recommended_test,
                affected_components=h.affected_components or [],
            )
            for h in (case.hypotheses or [])
        ],
        active_test=(
            DiagnosticTestType(
                id=case.active_test.id,
                title=case.active_test.title,
                objective=case.active_test.objective,
                hypothesis_ids=case.active_test.hypothesis_ids or [],
                required_tools=case.active_test.required_tools or [],
                prerequisites=case.active_test.prerequisites or [],
                safety_warnings=case.active_test.safety_warnings or [],
                procedure=case.active_test.procedure or [],
                expected_outcomes=[
                    ExpectedOutcomeType(
                        condition=exp.condition,
                        interpretation=exp.interpretation,
                    )
                    for exp in (case.active_test.expected_outcomes or [])
                ],
                discriminating_power=case.active_test.discriminating_power,
                why_this_test=case.active_test.why_this_test,
            )
            if case.active_test
            else None
        ),
        repair_plan=(
            RepairPlanType(
                fault_id=case.repair_plan.fault_id,
                component_to_replace=case.repair_plan.component_to_replace,
                replacement_specs=case.repair_plan.replacement_specs,
                required_tools=case.repair_plan.required_tools or [],
                prerequisites=case.repair_plan.prerequisites or [],
                safety_warnings=case.repair_plan.safety_warnings or [],
                procedure_steps=case.repair_plan.procedure_steps or [],
                counterfactual_prediction=CounterfactualPredictionType(
                    expected_visual_change=case.repair_plan.counterfactual_prediction.expected_visual_change,
                    expected_electrical_change=case.repair_plan.counterfactual_prediction.expected_electrical_change,
                    unacceptable_outcomes=case.repair_plan.counterfactual_prediction.unacceptable_outcomes or [],
                ),
                verification_method=case.repair_plan.verification_method,
            )
            if case.repair_plan
            else None
        ),
        verification_result=(
            VerificationResultType(
                status=case.verification_result.status,
                visual_match_score=case.verification_result.visual_match_score,
                detected_changes=case.verification_result.detected_changes or [],
                missing_expected_changes=case.verification_result.missing_expected_changes or [],
                summary=case.verification_result.summary,
                electrical_verification_required=case.verification_result.electrical_verification_required,
            )
            if case.verification_result
            else None
        ),
        confidence_timeline=[
            ConfidenceTimelineEntryType(
                timestamp=t.timestamp,
                stage=t.stage,
                hypothesis_id=t.hypothesis_id,
                confidence=t.confidence,
                trigger_event=t.trigger_event,
            )
            for t in (case.confidence_timeline or [])
        ],
        events=[
            DiagnosticEventType(
                id=evt.id,
                event_type=evt.event_type,
                description=evt.description,
                timestamp=evt.timestamp,
            )
            for evt in (case.events or [])
        ],
        initial_image_url=case.initial_image_url,
        latest_image_url=case.latest_image_url,
        after_image_url=case.after_image_url,
        created_at=case.created_at,
        updated_at=case.updated_at,
        expires_at=case.expires_at,
        resolved_at=case.resolved_at,
    )


