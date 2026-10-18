/**
 * REALITY → ACTION AI – Centralised GraphQL Service
 *
 * All GraphQL communication goes through this module.
 * Components never make raw fetch calls to the /graphql endpoint.
 *
 * Architecture:
 *   Component → hook → graphql.ts → /graphql → FastAPI + Strawberry → AI Service
 */

import type {
  AnalysisResult,
  FollowUpResult,
  ImageAuthenticityResult,
  DiagnosticCase,
} from '../types';
import { getAccessToken } from './auth';

// ── Config ────────────────────────────────────────────────────────────────

const GQL_ENDPOINT =
  import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:8000/graphql';

// ── Raw GraphQL fetcher ───────────────────────────────────────────────────

interface GQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; locations?: unknown; path?: unknown }>;
}

async function gqlFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const token = await getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // Non-blocking for unauthenticated requests
  }

  const response = await fetch(GQL_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Network error: ${response.status} ${response.statusText}`);
  }

  const json: GQLResponse<T> = await response.json();

  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors.map((e) => e.message).join(' | '));
  }

  if (json.data === undefined) {
    throw new Error('GraphQL response contained no data.');
  }

  return json.data;
}


// ── Mutations ─────────────────────────────────────────────────────────────

const ANALYZE_REALITY_MUTATION = /* GraphQL */ `
  mutation AnalyzeReality(
    $image: String!
    $question: String
    $sessionId: String
    $imageAuthenticity: String
    $aiGeneratedProbability: Float
    $authenticityConfidence: Float
    $authenticityModel: String
    $authenticityIndicators: [String!]
  ) {
    analyzeReality(
      image: $image
      question: $question
      sessionId: $sessionId
      imageAuthenticity: $imageAuthenticity
      aiGeneratedProbability: $aiGeneratedProbability
      authenticityConfidence: $authenticityConfidence
      authenticityModel: $authenticityModel
      authenticityIndicators: $authenticityIndicators
    ) {
      whatISee
      whatIsHappening
      nextAction
      steps
      confidence
      safetyWarning
      groundingSources
      visualFaults {
        id
        componentLabel
        description
        severity
        ymin
        xmin
        ymax
        xmax
      }
      imageAuthenticity
      aiGeneratedProbability
      authenticityConfidence
      authenticityModel
      authenticityIndicators
      safetyCategory
      emergencyResponse {
        safetyCategory
        severity
        emergencyRequired
        title
        message
        immediateActions
        avoidActions
        helplines {
          name
          number
        }
      }
    }
  }
`;

const ASK_FOLLOW_UP_MUTATION = /* GraphQL */ `
  mutation AskFollowUp($sessionId: String!, $question: String!) {
    askFollowUp(sessionId: $sessionId, question: $question) {
      answer
      steps
      confidence
      safetyWarning
      groundingSources
    }
  }
`;

// ── Queries ───────────────────────────────────────────────────────────────

const HEALTH_QUERY = /* GraphQL */ `
  query Health {
    health {
      status
      version
      aiMode
      provider
      model
    }
  }
`;

// ── Public API ────────────────────────────────────────────────────────────

export async function analyzeReality(
  image: string,
  question?: string,
  sessionId?: string,
  authenticity?: ImageAuthenticityResult | null,
): Promise<AnalysisResult> {
  const data = await gqlFetch<{ analyzeReality: AnalysisResult }>(
    ANALYZE_REALITY_MUTATION,
    {
      image,
      question: question ?? null,
      sessionId: sessionId ?? null,
      imageAuthenticity: authenticity?.status ?? null,
      aiGeneratedProbability: authenticity?.aiGeneratedProbability ?? null,
      authenticityConfidence: authenticity?.confidence ?? null,
      authenticityModel: authenticity?.model ?? null,
      authenticityIndicators: authenticity?.indicators ?? null,
    },
  );
  return data.analyzeReality;
}


export async function askFollowUp(
  sessionId: string,
  question: string,
): Promise<FollowUpResult> {
  const data = await gqlFetch<{ askFollowUp: FollowUpResult }>(
    ASK_FOLLOW_UP_MUTATION,
    { sessionId, question },
  );
  return data.askFollowUp;
}

export interface HealthResponse {
  health: {
    status: string;
    version: string;
    aiMode: string;
    provider: string;
    model: string;
  };
}

export async function fetchHealth(): Promise<HealthResponse> {
  return gqlFetch<HealthResponse>(HEALTH_QUERY);
}

const CLEAR_SESSION_MUTATION = /* GraphQL */ `
  mutation ClearSession($sessionId: String!) {
    clearSession(sessionId: $sessionId) {
      success
      sessionId
      message
    }
  }
`;

export async function clearSession(sessionId: string): Promise<boolean> {
  try {
    const data = await gqlFetch<{ clearSession: { success: boolean } }>(
      CLEAR_SESSION_MUTATION,
      { sessionId },
    );
    return data.clearSession.success;
  } catch (err) {
    console.warn('Failed to clear session on backend:', err);
    return false;
  }
}

// ── Diagnostic Intelligence Engine Operations ─────────────────────────────

const DIAGNOSTIC_CASE_FIELDS = /* GraphQL */ `
  fragment DiagnosticCaseFields on DiagnosticCaseType {
    id
    userId
    sessionId
    title
    domain
    status
    currentState
    investigationProgress
    initialImageUrl
    latestImageUrl
    afterImageUrl
    imageQuality {
      focus
      resolution
      glare
      lighting
      occlusion
      overall
      guidance
    }
    cameraCoach {
      target
      reason
      whereToPoint
      howClose
      whatAngle
      lightingRequirement
      whatMustBeVisible
    }
    evidence {
      id
      claim
      evidenceType
      provenance
      confidence
      sourceReference
    }
    identifiedComponents {
      id
      referenceDesignator
      componentType
      package
      marking
      orientation
      identityConfidence
      locationConfidence
      defectConfidence
    }
    faultBoxes {
      id
      label
      component
      defect
      ymin
      xmin
      ymax
      xmax
      confidence
      severity
      locationType
      observedEvidence
      inferredInterpretation
      unknowns
      recommendedInspection
    }
    hypotheses {
      id
      title
      confidence
      status
      riskLevel
      observedEvidence
      supportingEvidence
      disconfirmingEvidence
      recommendedTest
      affectedComponents
    }
    activeTest {
      id
      title
      objective
      hypothesisIds
      requiredTools
      prerequisites
      safetyWarnings
      procedure
      expectedOutcomes {
        condition
        interpretation
      }
      discriminatingPower
      whyThisTest
    }
    repairPlan {
      faultId
      componentToReplace
      replacementSpecs
      requiredTools
      prerequisites
      safetyWarnings
      procedureSteps
      counterfactualPrediction {
        expectedVisualChange
        expectedElectricalChange
        unacceptableOutcomes
      }
      verificationMethod
    }
    verificationResult {
      status
      visualMatchScore
      detectedChanges
      missingExpectedChanges
      summary
      electricalVerificationRequired
    }
    confidenceTimeline {
      timestamp
      stage
      hypothesisId
      confidence
      triggerEvent
    }
    events {
      id
      timestamp
      eventType
      description
    }
    createdAt
    updatedAt
    expiresAt
    resolvedAt
  }
`;

const CREATE_DIAGNOSTIC_CASE_MUTATION = /* GraphQL */ `
  ${DIAGNOSTIC_CASE_FIELDS}
  mutation CreateDiagnosticCase(
    $image: String!
    $question: String
    $sessionId: String
  ) {
    createDiagnosticCase(
      image: $image
      question: $question
      sessionId: $sessionId
    ) {
      ...DiagnosticCaseFields
    }
  }
`;

const SUBMIT_DIAGNOSTIC_TEST_MUTATION = /* GraphQL */ `
  ${DIAGNOSTIC_CASE_FIELDS}
  mutation SubmitDiagnosticTest(
    $caseId: String!
    $testId: String!
    $resultType: String!
    $numericValue: Float
    $unit: String
    $textValue: String
    $outcomeSelection: String
    $notes: String
  ) {
    submitDiagnosticTest(
      caseId: $caseId
      testId: $testId
      resultType: $resultType
      numericValue: $numericValue
      unit: $unit
      textValue: $textValue
      outcomeSelection: $outcomeSelection
      notes: $notes
    ) {
      ...DiagnosticCaseFields
    }
  }
`;

const VERIFY_REPAIR_MUTATION = /* GraphQL */ `
  ${DIAGNOSTIC_CASE_FIELDS}
  mutation VerifyRepair($caseId: String!, $afterImage: String!) {
    verifyRepair(caseId: $caseId, afterImage: $afterImage) {
      ...DiagnosticCaseFields
    }
  }
`;

const DELETE_DIAGNOSTIC_CASE_MUTATION = /* GraphQL */ `
  mutation DeleteDiagnosticCase($caseId: String!) {
    deleteDiagnosticCase(caseId: $caseId)
  }
`;

const GET_DIAGNOSTIC_CASE_QUERY = /* GraphQL */ `
  ${DIAGNOSTIC_CASE_FIELDS}
  query GetDiagnosticCase($id: String!) {
    diagnosticCase(id: $id) {
      ...DiagnosticCaseFields
    }
  }
`;

const LIST_DIAGNOSTIC_CASES_QUERY = /* GraphQL */ `
  ${DIAGNOSTIC_CASE_FIELDS}
  query ListDiagnosticCases($limit: Int) {
    diagnosticCases(limit: $limit) {
      ...DiagnosticCaseFields
    }
  }
`;

export async function createDiagnosticCase(
  image: string,
  question?: string,
  sessionId?: string,
): Promise<DiagnosticCase> {
  const data = await gqlFetch<{ createDiagnosticCase: DiagnosticCase }>(
    CREATE_DIAGNOSTIC_CASE_MUTATION,
    { image, question: question ?? null, sessionId: sessionId ?? null },
  );
  return data.createDiagnosticCase;
}

export async function submitDiagnosticTest(params: {
  caseId: string;
  testId: string;
  resultType: string;
  numericValue?: number | null;
  unit?: string | null;
  textValue?: string | null;
  outcomeSelection?: string | null;
  notes?: string | null;
}): Promise<DiagnosticCase> {
  const data = await gqlFetch<{ submitDiagnosticTest: DiagnosticCase }>(
    SUBMIT_DIAGNOSTIC_TEST_MUTATION,
    params,
  );
  return data.submitDiagnosticTest;
}

export async function verifyRepair(
  caseId: string,
  afterImage: string,
): Promise<DiagnosticCase> {
  const data = await gqlFetch<{ verifyRepair: DiagnosticCase }>(
    VERIFY_REPAIR_MUTATION,
    { caseId, afterImage },
  );
  return data.verifyRepair;
}

export async function getDiagnosticCase(
  id: string,
): Promise<DiagnosticCase | null> {
  const data = await gqlFetch<{ diagnosticCase: DiagnosticCase | null }>(
    GET_DIAGNOSTIC_CASE_QUERY,
    { id },
  );
  return data.diagnosticCase;
}

export async function listDiagnosticCases(
  limit: number = 20,
): Promise<DiagnosticCase[]> {
  const data = await gqlFetch<{ diagnosticCases: DiagnosticCase[] }>(
    LIST_DIAGNOSTIC_CASES_QUERY,
    { limit },
  );
  return data.diagnosticCases || [];
}

export async function deleteDiagnosticCase(caseId: string): Promise<boolean> {
  const data = await gqlFetch<{ deleteDiagnosticCase: boolean }>(
    DELETE_DIAGNOSTIC_CASE_MUTATION,
    { caseId },
  );
  return data.deleteDiagnosticCase;
}

