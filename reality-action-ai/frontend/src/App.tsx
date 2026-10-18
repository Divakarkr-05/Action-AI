/**
 * REALITY → ACTION AI – Root Application & Diagnostic Workspace Shell
 *
 * Implements:
 * - Consistent App Shell (Sidebar + TopBar + Command Palette)
 * - Dynamic Dashboard Home (Hero with dynamic CTA priority, active case spotlight, 7-day TTL recent cases)
 * - Diagnostic Workspace (3-column layout on desktop, guided workflow on mobile)
 * - Detectra v3 local authenticity verification & image quality guidance
 * - Closed-loop diagnostic state machine
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { AnalysisPanel } from './components/AnalysisPanel';
import { CameraCapture } from './components/CameraCapture';
import { CommandPalette } from './components/CommandPalette';
import { FollowUpChat } from './components/FollowUpChat';
import { ImageUploader } from './components/ImageUploader';
import { LoadingState } from './components/LoadingState';
import { VisualFaultMap } from './components/VisualFaultMap';
import { DashboardHome } from './components/dashboard/DashboardHome';
import { DiagnosticEngineView } from './components/diagnostic/DiagnosticEngineView';
import { RecentCasesModal } from './components/diagnostic/RecentCasesModal';
import { Sidebar } from './components/navigation/Sidebar';
import { TopBar } from './components/navigation/TopBar';
import { useAuth } from './contexts/AuthContext';
import {
  analyzeReality,
  clearSession,
  createDiagnosticCase,
  deleteDiagnosticCase,
  listDiagnosticCases,
  submitDiagnosticTest,
  verifyRepair,
} from './services/graphql';
import { saveAnalysisToHistory } from './services/history';
import {
  detectImageAuthenticity,
  type ImageAuthenticityResult,
} from './services/authenticityDetector';
import type { AnalysisResult, AppState, DiagnosticCase, ImageFile } from './types';
import { getSmartUploadGuidance } from './utils/dashboardLogic';

export default function App() {
  // Navigation & Shell State
  const [activeView, setActiveView] = useState<'dashboard' | 'workspace'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isRecentCasesOpen, setIsRecentCasesOpen] = useState(false);

  // Diagnostic State Machine
  const [appState, setAppState] = useState<AppState>('empty');
  const [image, setImage] = useState<ImageFile | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [diagnosticCase, setDiagnosticCase] = useState<DiagnosticCase | null>(null);
  const [recentCases, setRecentCases] = useState<DiagnosticCase[]>([]);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [isSubmittingDiagnosticTest, setIsSubmittingDiagnosticTest] = useState(false);
  const [isVerifyingDiagnosticRepair, setIsVerifyingDiagnosticRepair] = useState(false);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [sessionId, setSessionId] = useState(() => uuidv4());
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFaultId, setSelectedFaultId] = useState<string | null>(null);

  // Authenticity detector state
  const [authenticityState, setAuthenticityState] = useState<
    'idle' | 'checking' | 'checked' | 'unavailable'
  >('idle');
  const [authenticityResult, setAuthenticityResult] =
    useState<ImageAuthenticityResult | null>(null);

  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load 7-Day Recent Cases on Mount ──────────────────────────────────────
  const refreshRecentCases = useCallback(async () => {
    try {
      const cases = await listDiagnosticCases();
      setRecentCases(cases);
    } catch {
      // Backend or network offline - fallback gracefully
    }
  }, []);

  useEffect(() => {
    refreshRecentCases();
  }, [refreshRecentCases]);

  // ── Keyboard shortcut listener for Command Palette (⌘K / Ctrl+K) ───────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      setActiveView('workspace');
      setIsSaved(true);
    }
  }, [location.state]);

  // ── Image Handling ───────────────────────────────────────────────────────
  const handleImageSelect = useCallback((img: ImageFile) => {
    setImage(img);
    setResult(null);
    setError(null);
    setIsSaved(false);
    setSelectedFaultId(null);
    setAppState('image-selected');
    setActiveView('workspace');

    // Run non-blocking authenticity check in background
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
    if (sessionId) {
      clearSession(sessionId).catch(() => {});
    }
    setSessionId(uuidv4());
    setImage(null);
    setResult(null);
    setError(null);
    setIsSaved(false);
    setSelectedFaultId(null);
    setAuthenticityState('idle');
    setAuthenticityResult(null);
    setAppState('empty');
  }, [sessionId]);

  const handleReset = useCallback(() => {
    if (sessionId) {
      clearSession(sessionId).catch(() => {});
    }
    setSessionId(uuidv4());
    setImage(null);
    setResult(null);
    setDiagnosticCase(null);
    setError(null);
    setQuestion('');
    setIsSaved(false);
    setIsSaving(false);
    setSelectedFaultId(null);
    setAuthenticityState('idle');
    setAuthenticityResult(null);
    setAppState('empty');
    setActiveView('dashboard');
    refreshRecentCases();
  }, [sessionId, refreshRecentCases]);

  const handleStartNewDiagnosis = useCallback(() => {
    if (sessionId) {
      clearSession(sessionId).catch(() => {});
    }
    setSessionId(uuidv4());
    setImage(null);
    setResult(null);
    setDiagnosticCase(null);
    setError(null);
    setQuestion('');
    setSelectedFaultId(null);
    setAuthenticityState('idle');
    setAuthenticityResult(null);
    setAppState('empty');
    setActiveView('workspace');
  }, [sessionId]);

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

  // ── Single-turn Analysis ─────────────────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    if (!image) return;

    setAppState('analyzing');
    setError(null);
    setIsSaved(false);

    try {
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

  // ── Diagnostic Case Lifecycle ────────────────────────────────────────────
  const handleDiagnoseCase = useCallback(async () => {
    if (!image) return;

    setIsDiagnosing(true);
    setError(null);
    setIsSaved(false);

    try {
      const newCase = await createDiagnosticCase(
        image.dataUrl,
        question || 'Diagnose electronics fault and recommend the best discriminating test.',
        sessionId,
      );
      setDiagnosticCase({
        ...newCase,
        initialImageUrl: newCase.initialImageUrl || image.dataUrl,
        latestImageUrl: newCase.latestImageUrl || image.dataUrl,
      });
      setAppState('complete');
      setActiveView('workspace');
      refreshRecentCases();
    } catch (err) {
      console.error('Failed to initialize diagnostic case:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Could not start the diagnostic case. Please try again.',
      );
      setAppState('error');
    } finally {
      setIsDiagnosing(false);
    }
  }, [image, question, sessionId, refreshRecentCases]);

  const handleSubmitDiagnosticTest = useCallback(
    async (params: {
      resultType: 'NUMERIC' | 'TEXT' | 'CHOICE';
      numericValue?: number;
      unit?: string;
      textValue?: string;
      notes?: string;
    }) => {
      if (!diagnosticCase || !diagnosticCase.activeTest) return;
      setIsSubmittingDiagnosticTest(true);
      setError(null);
      try {
        const updated = await submitDiagnosticTest({
          caseId: diagnosticCase.id,
          testId: diagnosticCase.activeTest.id,
          resultType: params.resultType,
          numericValue: params.numericValue,
          unit: params.unit,
          textValue: params.textValue,
          notes: params.notes,
        });
        setDiagnosticCase(updated);
        refreshRecentCases();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to submit test measurement.',
        );
      } finally {
        setIsSubmittingDiagnosticTest(false);
      }
    },
    [diagnosticCase, refreshRecentCases],
  );

  const handleVerifyRepair = useCallback(
    async (afterImageBase64: string) => {
      if (!diagnosticCase) return;
      setIsVerifyingDiagnosticRepair(true);
      setError(null);
      try {
        const updated = await verifyRepair(diagnosticCase.id, afterImageBase64);
        setDiagnosticCase(updated);
        refreshRecentCases();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to verify repair.',
        );
      } finally {
        setIsVerifyingDiagnosticRepair(false);
      }
    },
    [diagnosticCase, refreshRecentCases],
  );

  const handleSelectRecentCase = useCallback((selectedCase: DiagnosticCase) => {
    setDiagnosticCase(selectedCase);
    setResult(null);
    setAppState('complete');
    setActiveView('workspace');
    setIsRecentCasesOpen(false);
  }, []);

  const handleDeleteCase = useCallback(
    async (caseId: string) => {
      try {
        await deleteDiagnosticCase(caseId);
        if (diagnosticCase?.id === caseId) {
          setDiagnosticCase(null);
          setAppState('empty');
          setActiveView('dashboard');
        }
        refreshRecentCases();
      } catch (err) {
        console.error('Failed to delete case:', err);
      }
    },
    [diagnosticCase, refreshRecentCases],
  );

  // Demo PCB simulation helper
  const handleSimulateDemoCase = useCallback(() => {
    // Generate a rich synthetic PCB test image data URL
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0c1a14';
      ctx.fillRect(0, 0, 600, 400);
      // PCB traces
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 50); ctx.lineTo(200, 50); ctx.lineTo(250, 150); ctx.stroke();
      ctx.moveTo(100, 300); ctx.lineTo(350, 300); ctx.lineTo(400, 200); ctx.stroke();
      // Component C12
      ctx.fillStyle = '#78350f';
      ctx.fillRect(200, 120, 100, 80);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(250, 160, 20, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('C12 470uF', 215, 110);
    }
    const demoDataUrl = canvas.toDataURL('image/jpeg');

    const fakeFile: ImageFile = {
      file: new File([], 'pcb_c12_demo.jpg', { type: 'image/jpeg' }),
      dataUrl: demoDataUrl,
      name: 'pcb_c12_demo.jpg',
      sizeKb: 34,
      type: 'image/jpeg',
    };

    handleImageSelect(fakeFile);
  }, [handleImageSelect]);

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

  const uploadGuidance = getSmartUploadGuidance(
    diagnosticCase?.imageQuality,
  );

  return (
    <div className="min-h-screen bg-graphite-950 text-white flex">
      {/* ── APP SHELL SIDEBAR ── */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onStartNewDiagnosis={handleStartNewDiagnosis}
        onOpenCases={() => setIsRecentCasesOpen(true)}
        activeCaseCount={recentCases.length}
      />

      {/* ── APP SHELL TOPBAR ── */}
      <TopBar
        isSidebarCollapsed={isSidebarCollapsed}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        activeCase={diagnosticCase}
        onJumpToActiveCase={() => {
          setActiveView('workspace');
          setAppState('complete');
        }}
      />

      {/* ── COMMAND PALETTE (⌘K) ── */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onStartNewDiagnosis={handleStartNewDiagnosis}
        onOpenRecentCases={() => setIsRecentCasesOpen(true)}
        onSimulateDemoCase={handleSimulateDemoCase}
        hasActiveCase={!!diagnosticCase}
        onContinueActiveCase={() => {
          setActiveView('workspace');
          setAppState('complete');
        }}
      />

      {/* ── RECENT 7-DAY CASES MODAL DRAWER ── */}
      <RecentCasesModal
        isOpen={isRecentCasesOpen}
        onClose={() => setIsRecentCasesOpen(false)}
        onSelectCase={handleSelectRecentCase}
      />

      {/* ── HIDDEN FILE PICKER ── */}
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

      {/* ── CAMERA CAPTURE MODAL ── */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* ── MAIN CONTENT WORKSPACE ── */}
      <div
        className={`flex-1 min-w-0 transition-all duration-300 ease-in-out pt-16 pb-16 px-4 sm:px-8 ${
          isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        {/* VIEW 1: DASHBOARD HOME */}
        {activeView === 'dashboard' && (
          <DashboardHome
            activeCase={diagnosticCase}
            recentCases={recentCases}
            onStartNewDiagnosis={handleStartNewDiagnosis}
            onContinueCase={(selectedCase) => {
              setDiagnosticCase(selectedCase);
              setResult(null);
              setAppState('complete');
              setActiveView('workspace');
            }}
            onDeleteCase={handleDeleteCase}
            onOpenKnowledge={() => navigate('/knowledge')}
            onOpenHistory={() => navigate('/history')}
            onOpenAllCases={() => setIsRecentCasesOpen(true)}
          />
        )}

        {/* VIEW 2: DIAGNOSTIC & SCAN WORKSPACE */}
        {activeView === 'workspace' && (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header & Breadcrumb */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveView('dashboard')}
                  className="font-mono text-xs text-white/40 hover:text-lime-400 uppercase transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>←</span>
                  <span>Dashboard</span>
                </button>
                <span className="text-white/20">/</span>
                <span className="font-mono text-xs text-white/80 font-bold">
                  {diagnosticCase
                    ? `Diagnostic Engine · ${diagnosticCase.title}`
                    : appState === 'image-selected'
                    ? 'Inspect Image & Configure Scan'
                    : appState === 'analyzing'
                    ? 'Processing Multimodal Analysis...'
                    : appState === 'complete'
                    ? 'Analysis Complete'
                    : 'New Diagnosis'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {appState !== 'empty' && (
                  <button
                    onClick={handleReset}
                    className="text-xs font-mono text-white/40 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    Reset Workspace
                  </button>
                )}
              </div>
            </div>

            {/* A. If a Diagnostic Case is Active -> 3-Column Diagnostic Workspace */}
            {diagnosticCase ? (
              <DiagnosticEngineView
                diagnosticCase={diagnosticCase}
                currentImageUrl={image?.dataUrl}
                onNewAnalysis={handleStartNewDiagnosis}
                onSubmitTestResult={handleSubmitDiagnosticTest}
                onVerifyRepair={handleVerifyRepair}
                isSubmittingTest={isSubmittingDiagnosticTest}
                isVerifyingRepair={isVerifyingDiagnosticRepair}
              />
            ) : (
              /* B. Image Upload & Selection Workspace */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Left Card: Image Drop Zone & Preview */}
                <div className="card p-5 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="section-title">Visual Input</h2>
                    {authenticityState === 'checking' && (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        <span>Detectra verifying authenticity...</span>
                      </div>
                    )}
                    {authenticityState === 'checked' && (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Authenticity verified</span>
                      </div>
                    )}
                    {authenticityState === 'unavailable' && (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-white/30">
                        <span>Authenticity check skipped</span>
                      </div>
                    )}
                  </div>

                  {appState === 'complete' && image ? (
                    <div className="flex flex-col gap-4">
                      <VisualFaultMap
                        imageUrl={image.dataUrl}
                        imageAlt={image.name}
                        faults={result?.visualFaults}
                        selectedFaultId={selectedFaultId}
                        onSelectFault={setSelectedFaultId}
                      />
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <span className="label-tech text-white/50">{image.name}</span>
                          <span className="label-tech text-white/30">·</span>
                          <span className="label-tech text-white/30">{image.sizeKb} KB</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleUploadClick}
                            className="label-tech text-lime-400/70 hover:text-lime-400 transition-colors uppercase"
                          >
                            NEW IMAGE
                          </button>
                          <button
                            onClick={handleReset}
                            className="label-tech text-white/30 hover:text-red-400/70 transition-colors uppercase"
                          >
                            RESET
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <ImageUploader
                        image={image}
                        onImageSelect={handleImageSelect}
                        onImageRemove={handleImageRemove}
                        onAnalyze={handleAnalyze}
                        onDiagnoseCase={handleDiagnoseCase}
                        question={question}
                        onQuestionChange={setQuestion}
                        isAnalyzing={appState === 'analyzing'}
                        isDiagnosing={isDiagnosing}
                      />

                      {/* Smart Upload Guidance */}
                      <div className="p-3 bg-graphite-900 border border-white/[0.06] rounded-xl text-xs font-mono space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-white/40 uppercase text-[10px]">
                            Image Inspection Guidance
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                              uploadGuidance.status === 'GOOD'
                                ? 'bg-emerald-400/10 text-emerald-400'
                                : 'bg-amber-400/10 text-amber-400'
                            }`}
                          >
                            {uploadGuidance.status === 'GOOD'
                              ? 'Quality Good'
                              : 'Needs Closer Photo'}
                          </span>
                        </div>
                        <p className="text-white/70">{uploadGuidance.message}</p>
                        <p className="text-[11px] text-lime-400/80">Tip: {uploadGuidance.tip}</p>
                      </div>

                      {/* Camera Button & Demo Quick-Start */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <button
                          onClick={handleCameraClick}
                          className="btn-ghost text-xs py-2 px-3 flex items-center gap-1.5"
                        >
                          <span>📸</span>
                          <span>Use Device Camera</span>
                        </button>

                        <button
                          onClick={handleSimulateDemoCase}
                          className="text-xs font-mono text-lime-400/80 hover:text-lime-400 transition-colors"
                        >
                          Load Demo PCB Image →
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Card: AI State, Loading, or Analysis Results */}
                <div className="card p-5 min-h-[480px] shadow-xl">
                  <h2 className="section-title mb-4">Diagnostic Processing</h2>

                  {appState === 'empty' && (
                    <div className="flex flex-col items-center justify-center h-80 gap-3 text-center">
                      <div className="w-12 h-12 rounded-xl bg-graphite-700/60 border border-white/[0.08] flex items-center justify-center text-xl">
                        ⚡
                      </div>
                      <p className="text-white font-mono text-sm font-bold">
                        Awaiting Visual Input
                      </p>
                      <p className="text-white/40 text-xs font-mono max-w-xs">
                        Select a photo of your PCB, circuit board, machine, or diagram to launch the closed-loop copilot.
                      </p>
                    </div>
                  )}

                  {appState === 'image-selected' && !isDiagnosing && (
                    <div className="flex flex-col items-center justify-center h-80 gap-4 text-center animate-fade-in">
                      <div className="w-12 h-12 rounded-xl bg-lime-400/10 border border-lime-400/30 flex items-center justify-center text-xl">
                        🔬
                      </div>
                      <div className="max-w-xs space-y-1">
                        <p className="text-white font-mono text-sm font-bold">
                          Image Loaded &amp; Ready
                        </p>
                        <p className="text-white/40 text-xs font-mono">
                          Click <span className="text-lime-400">DIAGNOSE ELECTRONICS</span> to isolate faults and receive a guided test procedure.
                        </p>
                      </div>
                    </div>
                  )}

                  {(appState === 'analyzing' || isDiagnosing) && (
                    <LoadingState
                      message={isDiagnosing ? 'Initializing Closed-Loop Diagnostic Copilot...' : undefined}
                      isDiagnostic={isDiagnosing}
                    />
                  )}

                  {appState === 'complete' && result && (
                    <AnalysisPanel
                      result={result}
                      onReset={handleReset}
                      isSaved={isSaved}
                      isSaving={isSaving}
                      onSave={user ? handleSaveToHistory : undefined}
                      selectedFaultId={selectedFaultId}
                      onSelectFault={setSelectedFaultId}
                    />
                  )}

                  {appState === 'error' && (
                    <div className="flex flex-col items-center justify-center h-80 gap-4 text-center animate-fade-in">
                      <div className="w-12 h-12 rounded-xl border border-red-500/20 bg-red-500/[0.05] flex items-center justify-center text-red-400 text-xl">
                        ⚠️
                      </div>
                      <div>
                        <p className="text-red-400 text-sm font-mono font-bold mb-1">
                          Diagnostic Step Failed
                        </p>
                        <p className="text-white/40 text-xs max-w-sm">{error}</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                          onClick={handleDiagnoseCase}
                          className="btn-primary text-xs py-2 px-4"
                        >
                          Retry Diagnosis
                        </button>
                        <button
                          onClick={() => {
                            setError(null);
                            setAppState('image-selected');
                          }}
                          className="btn-ghost text-xs py-2 px-4"
                        >
                          Back to Image
                        </button>
                        <button
                          onClick={() => setActiveView('dashboard')}
                          className="btn-ghost text-xs py-2 px-4 text-white/40"
                        >
                          Dashboard
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Follow-up chat for single-turn scans */}
            {appState === 'complete' && result && !diagnosticCase && (
              <div className="card p-6 shadow-xl">
                <FollowUpChat sessionId={sessionId} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
