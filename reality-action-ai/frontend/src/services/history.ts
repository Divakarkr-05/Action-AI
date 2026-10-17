/**
 * REALITY → ACTION AI – History Service
 *
 * GraphQL operations for analysis history.
 * All calls include the Supabase access token for authentication.
 */

import type { AnalysisResult } from '../types';
import { getAccessToken } from './auth';

// ── Config ────────────────────────────────────────────────────────────────

const GQL_ENDPOINT =
  import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:8000/graphql';

// ── Types ─────────────────────────────────────────────────────────────────

export interface AnalysisHistoryItem {
  id: string;
  question: string | null;
  whatISee: string | null;
  whatIsHappening: string | null;
  nextAction: string | null;
  steps: string[] | null;
  confidence: number | null;
  safetyWarning: string | null;
  imageUrl: string | null;
  createdAt: string | null;
}

export interface SaveAnalysisResult {
  success: boolean;
  historyId: string | null;
  message: string | null;
}

// ── Raw GraphQL fetcher (authenticated) ───────────────────────────────────

interface GQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function authGqlFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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

// ── Queries ───────────────────────────────────────────────────────────────

const ANALYSIS_HISTORY_QUERY = /* GraphQL */ `
  query AnalysisHistory($search: String, $limit: Int, $offset: Int) {
    analysisHistory(search: $search, limit: $limit, offset: $offset) {
      id
      question
      whatISee
      whatIsHappening
      nextAction
      steps
      confidence
      safetyWarning
      imageUrl
      createdAt
    }
  }
`;

const ANALYSIS_BY_ID_QUERY = /* GraphQL */ `
  query Analysis($id: String!) {
    analysis(id: $id) {
      id
      question
      whatISee
      whatIsHappening
      nextAction
      steps
      confidence
      safetyWarning
      imageUrl
      createdAt
    }
  }
`;

// ── Mutations ─────────────────────────────────────────────────────────────

const SAVE_ANALYSIS_MUTATION = /* GraphQL */ `
  mutation SaveAnalysis(
    $question: String
    $whatISee: String!
    $whatIsHappening: String!
    $nextAction: String!
    $steps: [String!]
    $confidence: Float!
    $safetyWarning: String
    $imageUrl: String
  ) {
    saveAnalysis(
      question: $question
      whatISee: $whatISee
      whatIsHappening: $whatIsHappening
      nextAction: $nextAction
      steps: $steps
      confidence: $confidence
      safetyWarning: $safetyWarning
      imageUrl: $imageUrl
    ) {
      success
      historyId
      message
    }
  }
`;

const DELETE_ANALYSIS_MUTATION = /* GraphQL */ `
  mutation DeleteAnalysis($id: String!) {
    deleteAnalysis(id: $id) {
      success
      message
    }
  }
`;

// ── Public API ────────────────────────────────────────────────────────────

export async function fetchAnalysisHistory(
  search?: string,
  limit: number = 50,
  offset: number = 0,
): Promise<AnalysisHistoryItem[]> {
  const data = await authGqlFetch<{ analysisHistory: AnalysisHistoryItem[] }>(
    ANALYSIS_HISTORY_QUERY,
    { search: search || null, limit, offset },
  );
  return data.analysisHistory;
}

export async function fetchAnalysisById(
  id: string,
): Promise<AnalysisHistoryItem | null> {
  const data = await authGqlFetch<{ analysis: AnalysisHistoryItem | null }>(
    ANALYSIS_BY_ID_QUERY,
    { id },
  );
  return data.analysis;
}

export async function saveAnalysisToHistory(
  result: AnalysisResult,
  question?: string,
  imageUrl?: string,
): Promise<SaveAnalysisResult> {
  const data = await authGqlFetch<{ saveAnalysis: SaveAnalysisResult }>(
    SAVE_ANALYSIS_MUTATION,
    {
      question: question || null,
      whatISee: result.whatISee,
      whatIsHappening: result.whatIsHappening,
      nextAction: result.nextAction,
      steps: result.steps,
      confidence: result.confidence,
      safetyWarning: result.safetyWarning || null,
      imageUrl: imageUrl || null,
    },
  );
  return data.saveAnalysis;
}

export async function deleteAnalysisFromHistory(
  id: string,
): Promise<{ success: boolean; message: string | null }> {
  const data = await authGqlFetch<{
    deleteAnalysis: { success: boolean; message: string | null };
  }>(DELETE_ANALYSIS_MUTATION, { id });
  return data.deleteAnalysis;
}
