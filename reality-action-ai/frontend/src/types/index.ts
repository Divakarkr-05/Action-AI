/**
 * REALITY → ACTION AI – TypeScript Domain Types
 *
 * These mirror the GraphQL schema and Pydantic models from the backend.
 * All GraphQL responses are mapped to these interfaces.
 */

// ── Core domain types ─────────────────────────────────────────────────────

export type AuthenticityStatus =
  | 'LIKELY_REAL'
  | 'LIKELY_AI_GENERATED'
  | 'UNCERTAIN'
  | 'UNAVAILABLE';

export interface ImageAuthenticityResult {
  status: AuthenticityStatus;
  aiGeneratedProbability: number | null;
  confidence: number | null;
  model: string;
  indicators: string[];
  error?: string | null;
}

export type SafetyCategory =
  | 'NORMAL'
  | 'POSSIBLE_DRUG_RELATED'
  | 'POSSIBLE_SELF_HARM'
  | 'POSSIBLE_SUICIDE_ATTEMPT'
  | 'POSSIBLE_SERIOUS_INJURY'
  | 'POSSIBLE_UNCONSCIOUS_PERSON'
  | 'EMERGENCY_UNCERTAIN';

export type SafetySeverity =
  | 'NORMAL'
  | 'INFO'
  | 'WARNING'
  | 'URGENT'
  | 'EMERGENCY';

export interface Helpline {
  name: string;
  number: string;
}

export interface EmergencyResponse {
  safetyCategory: SafetyCategory;
  severity: SafetySeverity;
  emergencyRequired: boolean;
  title: string;
  message: string;
  immediateActions: string[];
  avoidActions: string[];
  helplines: Helpline[];
}

export interface VisualFault {
  id: string;
  componentLabel: string;
  description: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface AnalysisResult {
  whatISee: string;
  whatIsHappening: string;
  nextAction: string;
  steps: string[];
  confidence: number;
  safetyWarning: string | null;
  groundingSources?: string[] | null;
  visualFaults?: VisualFault[] | null;
  imageAuthenticity?: AuthenticityStatus | null;
  aiGeneratedProbability?: number | null;
  authenticityConfidence?: number | null;
  authenticityModel?: string | null;
  authenticityIndicators?: string[] | null;
  safetyCategory?: SafetyCategory | null;
  emergencyResponse?: EmergencyResponse | null;
}

export interface FollowUpResult {
  answer: string;
  steps: string[] | null;
  confidence: number;
  safetyWarning: string | null;
  groundingSources?: string[] | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  result?: FollowUpResult;
}

// ── Input types ───────────────────────────────────────────────────────────

export interface AnalyzeInput {
  image: string;       // base-64 data URL
  question?: string;
  imageAuthenticity?: AuthenticityStatus | null;
  aiGeneratedProbability?: number | null;
  authenticityConfidence?: number | null;
  authenticityModel?: string | null;
  authenticityIndicators?: string[] | null;
}

export interface FollowUpInput {
  sessionId: string;
  question: string;
}

// ── UI state types ────────────────────────────────────────────────────────

export type AppState =
  | 'empty'
  | 'image-selected'
  | 'analyzing'
  | 'complete'
  | 'error';

export interface ImageFile {
  file: File;
  dataUrl: string;
  name: string;
  sizeKb: number;
  type: string;
}

export interface AppError {
  message: string;
  code?: string;
}

// ── Health ────────────────────────────────────────────────────────────────

export interface HealthResponse {
  health: {
    status: string;
    version: string;
    aiMode: string;
    model: string;
  };
}

// ── Diagnostic Engine Types (Phase 1 - Phase 35) ─────────────────────────

export type DiagnosticState =
  | 'OBSERVE'
  | 'IDENTIFY'
  | 'HYPOTHESIZE'
  | 'SAFETY_CHECK'
  | 'TEST_TO_KNOW'
  | 'AWAITING_TEST'
  | 'INTERPRET_RESULT'
  | 'NEXT_ACTION'
  | 'REPAIR'
  | 'VERIFY'
  | 'RESOLVED';

export type CaseStatus = 'IN_PROGRESS' | 'AWAITING_USER_INPUT' | 'REPAIRING' | 'RESOLVED' | 'ABANDONED';

export type QualityRating = 'GOOD' | 'WARNING' | 'BAD';
export type OverallQuality = 'SUFFICIENT' | 'NEEDS_BETTER_IMAGE' | 'INSUFFICIENT';

export interface ImageQualityAssessment {
  focus: QualityRating;
  resolution: QualityRating;
  glare: QualityRating;
  lighting: QualityRating;
  occlusion: QualityRating;
  overall: OverallQuality;
  guidance?: string | null;
}

export interface CameraCoachInstruction {
  target: string;
  reason: string;
  whereToPoint: string;
  howClose: string;
  whatAngle: string;
  lightingRequirement: string;
  whatMustBeVisible: string[];
}

export type EvidenceType = 'OBSERVED' | 'INFERRED' | 'UNKNOWN';
export type EvidenceProvenance =
  | 'USER_IMAGE'
  | 'USER_TEST'
  | 'RAG'
  | 'MODEL_INFERENCE'
  | 'SYSTEM_RULE'
  | 'DATASHEET'
  | 'SCHEMATIC';

export interface EvidenceItem {
  id: string;
  claim: string;
  evidenceType: EvidenceType;
  provenance: EvidenceProvenance;
  confidence: number;
  sourceReference?: string | null;
  sourceDocId?: string | null;
}

export interface IdentifiedComponent {
  id: string;
  referenceDesignator: string;
  componentType: string;
  package?: string | null;
  marking?: string | null;
  orientation?: string | null;
  identityConfidence: number;
  locationConfidence: number;
  defectConfidence: number;
}

export interface FaultBox {
  id: string;
  label: string;
  component: string;
  defect: string;
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
  confidence: number;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  locationType: 'PRECISE' | 'APPROXIMATE' | 'UNKNOWN';
  observedEvidence: string[];
  inferredInterpretation?: string | null;
  unknowns: string[];
  recommendedInspection?: string | null;
}

export type HypothesisStatus = 'ACTIVE' | 'WEAKENED' | 'SUPPORTED' | 'REFUTED' | 'RESOLVED';

export interface Hypothesis {
  id: string;
  title: string;
  confidence: number;
  status: HypothesisStatus;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  observedEvidence: string[];
  supportingEvidence: string[];
  disconfirmingEvidence: string[];
  recommendedTest?: string | null;
  affectedComponents: string[];
}

export interface ExpectedOutcome {
  condition: string;
  interpretation: string;
  hypothesisImpact: Record<string, number>;
}

export interface DiagnosticTest {
  id: string;
  title: string;
  objective: string;
  hypothesisIds: string[];
  requiredTools: string[];
  prerequisites: string[];
  safetyWarnings: string[];
  procedure: string[];
  expectedOutcomes: ExpectedOutcome[];
  discriminatingPower: number;
  whyThisTest: string;
}

export interface TestResultSubmission {
  testId: string;
  resultType: 'NUMERIC' | 'TEXT' | 'IMAGE' | 'CHOICE';
  numericValue?: number | null;
  unit?: string | null;
  textValue?: string | null;
  selectedOutcome?: string | null;
  notes?: string | null;
}

export interface TestInterpretation {
  testId: string;
  outcome: 'CONFIRMS' | 'REFUTES' | 'PARTIALLY_SUPPORTS' | 'INCONCLUSIVE' | 'UNEXPECTED';
  summary: string;
  confidenceDeltas: Record<string, number>;
  hypothesisUpdates: Hypothesis[];
  nextAction: string;
}

export interface CounterfactualPrediction {
  expectedVisualChange: string;
  expectedElectricalChange: string;
  unacceptableOutcomes: string[];
}

export interface RepairPlan {
  faultId: string;
  componentToReplace: string;
  replacementSpecs: string;
  requiredTools: string[];
  prerequisites: string[];
  safetyWarnings: string[];
  procedureSteps: string[];
  counterfactualPrediction?: CounterfactualPrediction | null;
  verificationMethod: string;
}

export interface VerificationResult {
  status: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'NOT_VERIFIED' | 'INCONCLUSIVE';
  visualMatchScore: number;
  detectedChanges: string[];
  missingExpectedChanges: string[];
  summary: string;
  electricalVerificationRequired: boolean;
}

export interface ConfidenceTimelineEntry {
  timestamp: string;
  stage: string;
  hypothesisId: string;
  confidence: number;
  triggerEvent: string;
}

export interface DiagnosticEvent {
  id: string;
  timestamp: string;
  eventType: string;
  description?: string;
  payload?: Record<string, any>;
}

export interface DiagnosticCase {
  id: string;
  userId: string;
  sessionId: string;
  title: string;
  domain: string;
  status: CaseStatus;
  currentState: DiagnosticState;
  investigationProgress: number;
  initialImageUrl?: string | null;
  latestImageUrl?: string | null;
  afterImageUrl?: string | null;
  imageQuality?: ImageQualityAssessment | null;
  cameraCoach?: CameraCoachInstruction | null;
  evidence: EvidenceItem[];
  identifiedComponents: IdentifiedComponent[];
  faultBoxes: FaultBox[];
  hypotheses: Hypothesis[];
  activeTest?: DiagnosticTest | null;
  repairPlan?: RepairPlan | null;
  verificationResult?: VerificationResult | null;
  confidenceTimeline: ConfidenceTimelineEntry[];
  events: DiagnosticEvent[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  resolvedAt?: string | null;
}

