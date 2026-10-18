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

export interface AnalysisResult {
  whatISee: string;
  whatIsHappening: string;
  nextAction: string;
  steps: string[];
  confidence: number;
  safetyWarning: string | null;
  groundingSources?: string[] | null;
  imageAuthenticity?: AuthenticityStatus | null;
  aiGeneratedProbability?: number | null;
  authenticityConfidence?: number | null;
  authenticityModel?: string | null;
  authenticityIndicators?: string[] | null;
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
