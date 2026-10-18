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
} from '../types';

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
  const response = await fetch(GQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

export async function fetchHealth() {
  return gqlFetch<{
    health: { status: string; version: string; aiMode: string; model: string };
  }>(HEALTH_QUERY);
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

