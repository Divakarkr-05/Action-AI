/**
 * REALITY → ACTION AI – Centralised GraphQL Service
 *
 * All GraphQL communication goes through this module.
 * Components never make raw fetch calls to the /graphql endpoint.
 *
 * Architecture:
 *   Component → hook → graphql.ts → /graphql → FastAPI + Strawberry → AI Service
 */

import type { AnalysisResult, FollowUpResult } from '../types';

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
  mutation AnalyzeReality($image: String!, $question: String, $sessionId: String) {
    analyzeReality(image: $image, question: $question, sessionId: $sessionId) {
      whatISee
      whatIsHappening
      nextAction
      steps
      confidence
      safetyWarning
      groundingSources
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
): Promise<AnalysisResult> {
  const data = await gqlFetch<{ analyzeReality: AnalysisResult }>(
    ANALYZE_REALITY_MUTATION,
    { image, question: question ?? null, sessionId: sessionId ?? null },
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
