/**
 * EmptyState – Landing hero shown before any image is selected.
 */

interface EmptyStateProps {
  onUploadClick: () => void;
  onCameraClick: () => void;
  question: string;
  onQuestionChange: (q: string) => void;
}

export function EmptyState({
  onUploadClick,
  onCameraClick,
  question,
  onQuestionChange,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] px-6 pt-14 animate-fade-in">
      {/* Hero text */}
      <div className="text-center mb-12 max-w-2xl">
        <div className="label-tech mb-6 flex items-center justify-center gap-2">
          <span className="w-8 h-px bg-lime-400/40" />
          <span>AI Field Intelligence Interface</span>
          <span className="w-8 h-px bg-lime-400/40" />
        </div>

        <h1 className="font-sans font-bold leading-[0.9] tracking-tight mb-6">
          <span className="block text-6xl sm:text-7xl text-white">SEE IT.</span>
          <span className="block text-6xl sm:text-7xl text-white/60">UNDERSTAND IT.</span>
          <span className="block text-6xl sm:text-7xl text-gradient-lime">ACT.</span>
        </h1>

        <p className="text-white/50 text-lg font-light tracking-wide max-w-md mx-auto">
          Turn what you see into clear, context-aware action.
        </p>
      </div>

      {/* Drop zone */}
      <DropZone onUploadClick={onUploadClick} />

      {/* Question input */}
      <div className="mt-6 w-full max-w-xl">
        <div className="relative">
          <input
            id="landing-question"
            type="text"
            value={question}
            onChange={(e) => onQuestionChange(e.target.value)}
            placeholder="What should I do next? (optional)"
            className="w-full bg-graphite-800 border border-white/[0.08] rounded-xl px-4 py-3.5
                       text-white/80 text-sm placeholder:text-white/25 font-mono
                       focus:outline-none focus:border-lime-400/30 focus:bg-graphite-700
                       transition-all duration-200"
          />
          {question && (
            <button
              onClick={() => onQuestionChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60
                         transition-colors text-lg leading-none"
              aria-label="Clear question"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Camera button */}
      <div className="mt-4 flex items-center gap-3">
        <button onClick={onCameraClick} className="btn-ghost text-xs">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 4.5A1.5 1.5 0 012.5 3h.5L4 1.5h6L11 3h.5A1.5 1.5 0 0113 4.5v6A1.5 1.5 0 0111.5 12h-9A1.5 1.5 0 011 10.5v-6z"
              stroke="currentColor" strokeWidth="1.2" fill="none"/>
            <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
          USE CAMERA
        </button>
        <span className="label-tech">or drag & drop above</span>
      </div>

      {/* Bottom context */}
      <div className="mt-16 flex items-center gap-8 opacity-30">
        {['Circuits', 'Machines', 'Diagrams', 'Technical Problems'].map((item) => (
          <span key={item} className="label-tech">{item}</span>
        ))}
      </div>
    </div>
  );
}

// ── Internal: Drop zone ────────────────────────────────────────────────────

interface DropZoneProps {
  onUploadClick: () => void;
}

function DropZone({ onUploadClick }: DropZoneProps) {
  return (
    <button
      id="upload-drop-zone"
      onClick={onUploadClick}
      className="group w-full max-w-xl relative overflow-hidden
                 border-2 border-dashed border-white/[0.12] rounded-2xl
                 bg-graphite-900/60 hover:bg-graphite-800/80
                 hover:border-lime-400/30 hover:shadow-glow-lime-sm
                 transition-all duration-300 ease-out
                 p-12 text-center cursor-pointer"
      aria-label="Upload image drop zone"
    >
      {/* Icon */}
      <div className="mx-auto mb-4 w-14 h-14 rounded-xl
                      bg-graphite-700 border border-white/[0.07]
                      flex items-center justify-center
                      group-hover:border-lime-400/20 group-hover:bg-graphite-600
                      transition-all duration-300">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-lime-400/70 group-hover:text-lime-400 transition-colors">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>

      <p className="font-mono font-semibold text-sm tracking-[0.12em] uppercase text-white/80
                    group-hover:text-white transition-colors mb-1">
        SHOW ME REALITY
      </p>
      <p className="text-white/35 text-xs font-light max-w-xs mx-auto leading-relaxed">
        Upload a photo of something you're trying to understand, troubleshoot, or act on.
      </p>

      <div className="mt-5">
        <span className="btn-primary text-xs px-5 py-2.5 pointer-events-none">
          UPLOAD IMAGE
        </span>
      </div>

      <p className="mt-3 label-tech text-white/20">JPEG · PNG · WEBP — Max 10 MB</p>
    </button>
  );
}
