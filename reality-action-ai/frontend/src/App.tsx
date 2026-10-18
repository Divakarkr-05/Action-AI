/**
 * REALITY → ACTION AI – Root Application Component
 *
 * State machine:
 *   empty → image-selected → analyzing → complete
 *                          ↘ error
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { AnalysisPanel } from './components/AnalysisPanel';
import { CameraCapture } from './components/CameraCapture';
import { EmptyState } from './components/EmptyState';
import { FollowUpChat } from './components/FollowUpChat';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { LoadingState } from './components/LoadingState';
import { useAuth } from './contexts/AuthContext';
import { analyzeReality } from './services/graphql';
import { saveAnalysisToHistory } from './services/history';
import {
  detectImageAuthenticity,
  type ImageAuthenticityResult,
} from './services/authenticityDetector';
import type { AnalysisResult, AppState, ImageFile } from './types';

export default function App() {
  const [appState, setAppState] = useState<AppState>('empty');
  const [image, setImage] = useState<ImageFile | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Authenticity detector state
  const [authenticityState, setAuthenticityState] = useState<
    'idle' | 'checking' | 'checked' | 'unavailable'
  >('idle');
  const [authenticityResult, setAuthenticityResult] =
    useState<ImageAuthenticityResult | null>(null);

  const { user } = useAuth();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Restore state from history navigation if present ─────────────────────
  useEffect(() => {
    const state = location.state as {
      restoredAnalysis?: AnalysisResult;
      restoredQuestion?: string;
    } | null;

    if (state?.restoredAnalysis) {
      setResult(state.restoredAnalysis);
      setQuestion(state.restoredQuestion || '');
      setAppState('complete');
      setIsSaved(true);
    }
  }, [location.state]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleImageSelect = useCallback((img: ImageFile) => {
    setImage(img);
    setResult(null);
    setError(null);
    setIsSaved(false);
    setAppState('image-selected');

    // Start authenticity check eagerly in the background (non-blocking)
    setAuthenticityState('checking');
    detectImageAuthenticity(img.dataUrl)
      .then((authRes) => {
        setAuthenticityResult(authRes);
        setAuthenticityState(
          authRes.status === 'UNAVAILABLE' ? 'unavailable' : 'checked',
        );
      })
      .catch(() => {
        setAuthenticityState('unavailable');
      });
  }, []);

  const handleImageRemove = useCallback(() => {
    setImage(null);
    setResult(null);
    setError(null);
    setIsSaved(false);
    setAuthenticityState('idle');
    setAuthenticityResult(null);
    setAppState('empty');
  }, []);

  const handleSaveToHistory = useCallback(async () => {
    if (!result || !user || isSaved || isSaving) return;
    setIsSaving(true);
    try {
      const res = await saveAnalysisToHistory(
        result,
        question || undefined,
        image?.dataUrl,
      );
      if (res.success) {
        setIsSaved(true);
      }
    } catch (err) {
      console.error('Failed to save analysis to history:', err);
    } finally {
      setIsSaving(false);
    }
  }, [result, user, isSaved, isSaving, question, image]);

  const handleAnalyze = useCallback(async () => {
    if (!image) return;

    setAppState('analyzing');
    setError(null);
    setIsSaved(false);

    try {
      // Ensure authenticity detection has completed or run
      let currentAuth = authenticityResult;
      if (!currentAuth || currentAuth.status === 'UNAVAILABLE') {
        try {
          currentAuth = await detectImageAuthenticity(image.dataUrl);
          setAuthenticityResult(currentAuth);
          setAuthenticityState(
            currentAuth.status === 'UNAVAILABLE' ? 'unavailable' : 'checked',
          );
        } catch {
          // Failure in authenticity detector should never block analysis
        }
      }

      const analysisResult = await analyzeReality(
        image.dataUrl,
        question || undefined,
        sessionId,
        currentAuth,
      );
      setResult(analysisResult);
      setAppState('complete');

      // Auto-save if authenticated
      if (user) {
        try {
          setIsSaving(true);
          const saveRes = await saveAnalysisToHistory(
            analysisResult,
            question || undefined,
            image.dataUrl,
          );
          if (saveRes.success) {
            setIsSaved(true);
          }
        } catch (saveErr) {
          console.error('Auto-save to history failed:', saveErr);
        } finally {
          setIsSaving(false);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Analysis failed. Please try again.',
      );
      setAppState('error');
    }
  }, [image, question, user, sessionId, authenticityResult]);

  const handleReset = useCallback(() => {
    setImage(null);
    setResult(null);
    setError(null);
    setQuestion('');
    setIsSaved(false);
    setIsSaving(false);
    setAuthenticityState('idle');
    setAuthenticityResult(null);
    setAppState('empty');
  }, []);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleCameraClick = useCallback(() => {
    setShowCamera(true);
  }, []);

  const handleCameraCapture = useCallback(
    (img: ImageFile) => {
      setShowCamera(false);
      handleImageSelect(img);
    },
    [handleImageSelect],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-graphite-950">
      <Header aiMode="mock" />

      {/* Hidden file input (for direct reference in EmptyState) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            handleImageSelect({
              file,
              dataUrl,
              name: file.name,
              sizeKb: Math.round(file.size / 1024),
              type: file.type,
            });
          };
          reader.readAsDataURL(file);
          e.target.value = '';
        }}
      />

      {/* Camera capture modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* ── EMPTY STATE ── */}
      {appState === 'empty' && (
        <EmptyState
          onUploadClick={handleUploadClick}
          onCameraClick={handleCameraClick}
          question={question}
          onQuestionChange={setQuestion}
        />
      )}

      {/* ── WORKSPACE (image-selected / analyzing / complete / error) ── */}
      {appState !== 'empty' && (
        <main className="max-w-7xl mx-auto px-6 pt-20 pb-16">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-8">
            <button
              onClick={handleReset}
              className="label-tech text-white/30 hover:text-lime-400/60 transition-colors uppercase"
            >
              ← New Analysis
            </button>
            <span className="text-white/20">·</span>
            <span className="label-tech text-white/30 capitalize">
              {appState === 'image-selected'
                ? 'Image Ready'
                : appState === 'analyzing'
                ? 'Processing...'
                : appState === 'complete'
                ? 'Analysis Complete'
                : 'Error'}
            </span>
          </div>

          {/* Two-column workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* LEFT: Image uploader */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title">Image</h2>
                {authenticityState === 'checking' && (
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span>Checking image authenticity...</span>
                  </div>
                )}
                {authenticityState === 'checked' && (
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400/90">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Authenticity checked</span>
                  </div>
                )}
                {authenticityState === 'unavailable' && (
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-white/30">
                    <span>Authenticity check unavailable</span>
                  </div>
                )}
              </div>
              <ImageUploader
                image={image}
                onImageSelect={handleImageSelect}
                onImageRemove={handleImageRemove}
                onAnalyze={handleAnalyze}
                question={question}
                onQuestionChange={setQuestion}
                isAnalyzing={appState === 'analyzing'}
              />
            </div>

            {/* RIGHT: Analysis results / loading / error */}
            <div className="card p-5 min-h-[480px]">
              <h2 className="section-title mb-4">AI Analysis</h2>

              {(appState === 'image-selected') && (
                <div className="flex flex-col items-center justify-center h-64 gap-3 animate-fade-in">
                  <div className="w-10 h-10 rounded-xl border border-white/[0.08] bg-graphite-700
                                  flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-white/20">
                      <path d="M9 3a6 6 0 100 12A6 6 0 009 3zM9 7v2l1.5 1.5"
                        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <p className="text-white/30 text-sm font-mono text-center">
                    Press <span className="text-lime-400/50">ANALYZE REALITY</span> to begin.
                  </p>
                </div>
              )}

              {appState === 'analyzing' && <LoadingState />}

              {appState === 'complete' && result && (
                <AnalysisPanel
                  result={result}
                  onReset={handleReset}
                  isSaved={isSaved}
                  isSaving={isSaving}
                  onSave={user ? handleSaveToHistory : undefined}
                />
              )}

              {appState === 'error' && (
                <div className="flex flex-col items-center justify-center h-64 gap-4 animate-fade-in">
                  <div className="w-12 h-12 rounded-xl border border-red-500/20 bg-red-500/[0.05]
                                  flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-red-400/60">
                      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M10 6v4M10 13h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-red-400/80 text-sm font-mono mb-1">Analysis Failed</p>
                    <p className="text-white/30 text-xs">{error}</p>
                  </div>
                  <button onClick={handleAnalyze} className="btn-ghost text-xs">
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Follow-up chat — only shown after successful analysis */}
          {appState === 'complete' && result && (
            <div className="mt-8 card p-6">
              <FollowUpChat sessionId={sessionId} />
            </div>
          )}
        </main>
      )}
    </div>
  );
}
