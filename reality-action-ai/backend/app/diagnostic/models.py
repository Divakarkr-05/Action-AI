"""
REALITY → ACTION AI – Diagnostic Domain Models & Schemas

Implements the formal diagnostic copilot entities:
- Closed-loop diagnostic state machine states
- Epistemically rigorous Evidence Model (OBSERVED / INFERRED / UNKNOWN)
- Component identification with decoupled confidence budgets
- Visual Fault Map with normalized spatial bounding boxes
- Hypothesis Tree with disconfirming evidence ("What would prove me wrong?")
- Test-to-Know Engine with information gain rationale
- Physical test submission & interpretation
- Counterfactual repair prediction & Before/After verification
- 7-day temporary Diagnostic Case lifecycle
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


def is_valid_uuid(val: Any) -> bool:
    """Validate if val is a valid standard UUID string."""
    if not val or not isinstance(val, str):
        return False
    try:
        parsed = uuid.UUID(val.strip())
        return str(parsed).lower() == val.strip().lower()
    except (ValueError, AttributeError):
        return False



# ── State Machine States ─────────────────────────────────────────────────────

DiagnosticState = Literal[
    "OBSERVE",
    "IDENTIFY",
    "HYPOTHESIZE",
    "SAFETY_CHECK",
    "TEST_TO_KNOW",
    "AWAITING_TEST",
    "INTERPRET_RESULT",
    "NEXT_ACTION",
    "REPAIR",
    "VERIFY",
    "RESOLVED",
]

CaseStatus = Literal[
    "IN_PROGRESS",
    "RESOLVED",
    "ABANDONED",
]


# ── Epistemic Evidence Model ─────────────────────────────────────────────────

EvidenceType = Literal[
    "OBSERVED",   # Direct visual observation from physical reality
    "INFERRED",   # Inferred technical diagnosis or deduction
    "UNKNOWN",    # Explicitly unknown or unobservable without measurement
]

EvidenceProvenance = Literal[
    "USER_IMAGE",
    "USER_TEST",
    "RAG",
    "MODEL_INFERENCE",
    "SYSTEM_RULE",
    "DATASHEET",
    "SCHEMATIC",
]


class EvidenceItem(BaseModel):
    """An individual atomic claim with explicit epistemic boundary and provenance."""
    id: str = Field(..., description="Unique evidence identifier, e.g. ev_1")
    claim: str = Field(..., description="The factual or inferred statement.")
    evidence_type: EvidenceType = Field(..., description="OBSERVED, INFERRED, or UNKNOWN.")
    provenance: EvidenceProvenance = Field(default="MODEL_INFERENCE")
    source_reference: Optional[str] = Field(None, description="Source grounding doc or image reference.")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


# ── Image Quality & Active Camera Coach ──────────────────────────────────────

QualityRating = Literal["GOOD", "WARNING", "BAD"]
OverallQuality = Literal["SUFFICIENT", "NEEDS_BETTER_IMAGE", "INSUFFICIENT"]


class ImageQualityAssessment(BaseModel):
    """Evaluates optical and visual conditions before deep diagnostic reasoning."""
    focus: QualityRating = Field(default="GOOD")
    resolution: QualityRating = Field(default="GOOD")
    glare: QualityRating = Field(default="GOOD")
    lighting: QualityRating = Field(default="GOOD")
    occlusion: QualityRating = Field(default="GOOD")
    overall: OverallQuality = Field(default="SUFFICIENT")
    guidance: Optional[str] = Field(None, description="Camera adjustment advice if quality is low.")


class CameraCoachInstruction(BaseModel):
    """Targeted, specific guidance for capturing an optimal diagnostic photograph."""
    target: str = Field(default="Suspected component / board area", description="Component or region of interest, e.g. 'C12 Underside solder joints'")
    reason: str = Field(default="Inspect for micro-fractures, thermal stress, or solder bridging", description="Why this view is needed, e.g. 'Inspect for trace blowout or solder bridging'")
    where_to_point: str = Field(default="Directly at the highlighted fault region", description="Camera aim direction and alignment.")
    how_close: str = Field(default="Macro / 5-10cm focal distance filling 20-40% of the frame", description="Optimal focal distance and scale.")
    what_angle: str = Field(default="Perpendicular / 90 degrees", description="Recommended perspective, e.g. 'Perpendicular / 90 degrees'")
    lighting_requirement: str = Field(default="Diffused lighting without direct specular flash reflection.")
    what_must_be_visible: List[str] = Field(default_factory=list)


# ── Component Identification ─────────────────────────────────────────────────

class IdentifiedComponent(BaseModel):
    """Electronics component detection with decoupled confidence budgets."""
    id: str = Field(..., description="Component instance ID, e.g. comp_c12")
    reference_designator: str = Field(..., description="Silkscreen designator, e.g. 'C12', 'R8', 'U1'")
    component_type: str = Field(..., description="e.g. 'Electrolytic Capacitor', 'SMD Resistor', 'LDO Regulator'")
    package: Optional[str] = Field(None, description="e.g. 'Radial Can', '0805', 'SOT-223', 'SOIC-8'")
    marking: Optional[str] = Field(None, description="Observed text markings, e.g. '470uF 25V', '103'")
    orientation: Optional[str] = Field(None, description="Polarity notch or stripe orientation.")
    identity_confidence: float = Field(default=0.85, ge=0.0, le=1.0)
    location_confidence: float = Field(default=0.85, ge=0.0, le=1.0)
    defect_confidence: float = Field(default=0.5, ge=0.0, le=1.0)


# ── Visual Fault Map ─────────────────────────────────────────────────────────

FaultSeverity = Literal["CRITICAL", "WARNING", "INFO"]
LocationType = Literal["PRECISE", "APPROXIMATE", "UNKNOWN"]


class FaultBox(BaseModel):
    """Pinpointed visual defect or anomaly with normalized spatial coordinates."""
    id: str = Field(..., description="Fault box ID, e.g. fault_1")
    label: str = Field(..., description="Short display label, e.g. 'C12 Bulging Vent'")
    component: str = Field(..., description="Suspected component reference, e.g. 'C12'")
    defect: str = Field(..., description="Observed defect type, e.g. 'Electrolyte leakage and vented can'")
    ymin: float = Field(..., ge=0.0, le=1.0)
    xmin: float = Field(..., ge=0.0, le=1.0)
    ymax: float = Field(..., ge=0.0, le=1.0)
    xmax: float = Field(..., ge=0.0, le=1.0)
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)
    severity: FaultSeverity = Field(default="WARNING")
    location_type: LocationType = Field(default="PRECISE")
    observed_evidence: List[str] = Field(default_factory=list)
    inferred_interpretation: Optional[str] = None
    unknowns: List[str] = Field(default_factory=list)
    recommended_inspection: Optional[str] = None


# ── Hypothesis Tree ──────────────────────────────────────────────────────────

HypothesisStatus = Literal["ACTIVE", "SUPPORTED", "WEAKENED", "REFUTED", "RESOLVED"]


class Hypothesis(BaseModel):
    """A competing diagnostic explanation for the observed hardware state."""
    id: str = Field(..., description="Hypothesis identifier, e.g. H1")
    title: str = Field(..., description="Concise diagnostic cause, e.g. 'Failed Electrolytic Capacitor C12'")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Heuristic diagnostic confidence.")
    status: HypothesisStatus = Field(default="ACTIVE")
    risk_level: str = Field(default="MEDIUM", description="Operational/safety risk if true: HIGH, MEDIUM, LOW")
    observed_evidence: List[str] = Field(default_factory=list)
    supporting_evidence: List[str] = Field(default_factory=list)
    disconfirming_evidence: List[str] = Field(
        default_factory=list,
        description="Crucial anti-bias: What specific test or observation would prove this hypothesis wrong?",
    )
    recommended_test: Optional[str] = Field(None, description="Preferred test to validate or refute.")
    affected_components: List[str] = Field(default_factory=list)


# ── Test-To-Know Engine ──────────────────────────────────────────────────────

class ExpectedOutcome(BaseModel):
    condition: str = Field(..., description="e.g. 'LOW (< 400uF)', 'NORMAL (420-520uF)', 'HIGH (> 550uF)'")
    interpretation: str = Field(..., description="e.g. 'Confirms capacitor degradation (H1 supported)'")
    hypothesis_impact: Dict[str, float] = Field(
        default_factory=dict,
        description="Delta or target confidence adjustments per hypothesis ID.",
    )


class DiagnosticTest(BaseModel):
    """The highest-information-gain test recommended to differentiate competing hypotheses."""
    id: str = Field(..., description="Test ID, e.g. test_1")
    title: str = Field(..., description="e.g. 'Measure Capacitance of C12'")
    objective: str = Field(..., description="What this test aims to prove or disprove.")
    hypothesis_ids: List[str] = Field(default_factory=list, description="Hypotheses separated by this test.")
    required_tools: List[str] = Field(default_factory=list, description="e.g. ['Multimeter with capacitance mode']")
    prerequisites: List[str] = Field(default_factory=list, description="e.g. ['Device unplugged', 'Capacitor discharged']")
    safety_warnings: List[str] = Field(default_factory=list)
    procedure: List[str] = Field(..., description="Step-by-step physical test protocol.")
    expected_outcomes: List[ExpectedOutcome] = Field(default_factory=list)
    discriminating_power: float = Field(default=0.85, ge=0.0, le=1.0)
    why_this_test: str = Field(..., description="Plain-language explanation of why this test is the best next step.")


class TestResultSubmission(BaseModel):
    """Physical test measurement or outcome submitted by the human operator."""
    test_id: str
    result_type: Literal["NUMERIC", "TEXT", "IMAGE", "SELECTED_OUTCOME"]
    numeric_value: Optional[float] = None
    unit: Optional[str] = None
    text_value: Optional[str] = None
    outcome_selection: Optional[str] = None
    notes: Optional[str] = None


class TestInterpretation(BaseModel):
    """Deterministic & AI interpretation of a submitted test result."""
    test_id: str
    outcome: Literal["CONFIRMS", "REFUTES", "PARTIALLY_SUPPORTS", "INCONCLUSIVE", "UNEXPECTED"]
    summary: str
    confidence_deltas: Dict[str, float] = Field(default_factory=dict)
    hypothesis_updates: List[Hypothesis] = Field(default_factory=list)
    next_action: str


# ── Component Relationships & Propagation ────────────────────────────────────

RelationshipType = Literal[
    "POWER_RAIL",
    "SIGNAL",
    "UPSTREAM",
    "DOWNSTREAM",
    "PHYSICALLY_ADJACENT",
    "PROTECTION",
]


class ComponentRelationship(BaseModel):
    """Topological relationship between components on the PCB."""
    from_component: str
    to_component: str
    relationship_type: RelationshipType
    notes: Optional[str] = None


# ── Repair Plan & Before/After Verification ──────────────────────────────────

class CounterfactualPrediction(BaseModel):
    """Predicted system and visual changes IF the diagnosis and repair are correct."""
    expected_visual_change: str
    expected_electrical_change: str
    unacceptable_outcomes: List[str] = Field(default_factory=list)


class RepairPlan(BaseModel):
    """Ordered, safety-vetted physical repair protocol."""
    fault_id: str
    component_to_replace: str
    replacement_specs: str
    required_tools: List[str]
    prerequisites: List[str]
    safety_warnings: List[str]
    procedure_steps: List[str]
    counterfactual_prediction: CounterfactualPrediction
    verification_method: str


VerificationStatus = Literal["VERIFIED", "PARTIALLY_VERIFIED", "NOT_VERIFIED", "INCONCLUSIVE", "FAILED"]


class VerificationResult(BaseModel):
    """Comparison between post-repair image/data and pre-repair diagnostic baseline."""
    status: VerificationStatus
    visual_match_score: float = Field(..., ge=0.0, le=1.0)
    detected_changes: List[str] = Field(default_factory=list)
    missing_expected_changes: List[str] = Field(default_factory=list)
    summary: str
    electrical_verification_required: bool = True


# ── Timeline & Audit Events ──────────────────────────────────────────────────

class ConfidenceTimelineEntry(BaseModel):
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    stage: str
    hypothesis_id: str
    confidence: float
    trigger_event: str


class DiagnosticEvent(BaseModel):
    id: str
    event_type: str
    description: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    payload: Optional[Dict[str, Any]] = None


# ── Primary Aggregate: DiagnosticCase ────────────────────────────────────────

class DiagnosticCase(BaseModel):
    """
    Closed-loop Diagnostic Case entity.
    Maintains complete state from initial observation to verified repair.
    Has a strict 7-day TTL lifecycle.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_id: str
    title: str = "Electronics Diagnostic Case"
    domain: str = "ELECTRONICS"
    status: CaseStatus = "IN_PROGRESS"
    current_state: DiagnosticState = "OBSERVE"
    investigation_progress: float = Field(default=0.10, ge=0.0, le=1.0)

    image_quality: Optional[ImageQualityAssessment] = None
    camera_coach: Optional[CameraCoachInstruction] = None

    evidence: List[EvidenceItem] = Field(default_factory=list)
    fault_boxes: List[FaultBox] = Field(default_factory=list)
    identified_components: List[IdentifiedComponent] = Field(default_factory=list)
    hypotheses: List[Hypothesis] = Field(default_factory=list)

    active_test: Optional[DiagnosticTest] = None
    test_history: List[Dict[str, Any]] = Field(default_factory=list)

    component_relationships: List[ComponentRelationship] = Field(default_factory=list)

    repair_plan: Optional[RepairPlan] = None
    verification_result: Optional[VerificationResult] = None

    confidence_timeline: List[ConfidenceTimelineEntry] = Field(default_factory=list)
    events: List[DiagnosticEvent] = Field(default_factory=list)

    initial_image_url: Optional[str] = None
    latest_image_url: Optional[str] = None
    after_image_url: Optional[str] = None

    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: str = Field(
        default_factory=lambda: (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    )
    resolved_at: Optional[str] = None
