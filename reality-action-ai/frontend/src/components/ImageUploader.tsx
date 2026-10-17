/**
 * ImageUploader – Handles drag-and-drop, file picker, preview, and removal.
 */

import { useCallback, useRef, useState } from 'react';
import type { ImageFile } from '../types';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

interface ImageUploaderProps {
  image: ImageFile | null;
  onImageSelect: (img: ImageFile) => void;
  onImageRemove: () => void;
  onAnalyze: () => void;
  question: string;
  onQuestionChange: (q: string) => void;
  isAnalyzing: boolean;
}

export function ImageUploader({
  image,
  onImageSelect,
  onImageRemove,
  onAnalyze,
  question,
  onQuestionChange,
  isAnalyzing,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(
    (file: File) => {
      setError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Unsupported file type. Please use JPEG, PNG, or WEBP.');
        return;
      }

      if (file.size > MAX_SIZE_BYTES) {
        setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        onImageSelect({
          file,
          dataUrl,
          name: file.name,
          sizeKb: Math.round(file.size / 1024),
          type: file.type,
        });
      };
      reader.readAsDataURL(file);
    },
    [onImageSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      // Reset so same file can be reselected
      e.target.value = '';
    },
    [processFile],
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileChange}
        className="hidden"
        id="file-input"
      />

      {/* Drop zone / preview area */}
      <div
        className={`relative rounded-xl overflow-hidden border transition-all duration-300
          ${dragOver
            ? 'border-lime-400/50 shadow-glow-lime bg-lime-400/[0.04]'
            : image
            ? 'border-white/[0.08]'
            : 'border-dashed border-white/[0.12] bg-graphite-900/60'
          }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{ minHeight: '320px' }}
      >
        {image ? (
          /* ── Preview ── */
          <div className="relative group">
            <img
              src={image.dataUrl}
              alt="Uploaded for analysis"
              className="w-full object-contain max-h-[480px] bg-graphite-900"
              style={{ display: 'block' }}
            />
            {/* Image meta overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-3
                            bg-gradient-to-t from-graphite-950/90 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="label-tech text-white/50">{image.name}</span>
                  <span className="label-tech text-white/30">·</span>
                  <span className="label-tech text-white/30">{image.sizeKb} KB</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="label-tech text-lime-400/70 hover:text-lime-400 transition-colors uppercase"
                    disabled={isAnalyzing}
                    aria-label="Replace image"
                  >
                    REPLACE
                  </button>
                  <button
                    onClick={onImageRemove}
                    className="label-tech text-white/30 hover:text-red-400/70 transition-colors uppercase"
                    disabled={isAnalyzing}
                    aria-label="Remove image"
                  >
                    REMOVE
                  </button>
                </div>
              </div>
            </div>

            {/* Drag-over overlay */}
            {dragOver && (
              <div className="absolute inset-0 flex items-center justify-center
                              bg-graphite-950/80 border-2 border-lime-400/50 rounded-xl">
                <span className="font-mono text-sm text-lime-400 uppercase tracking-wider">
                  Drop to replace
                </span>
              </div>
            )}
          </div>
        ) : (
          /* ── Empty drop zone ── */
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-full flex flex-col items-center justify-center gap-4 p-12 cursor-pointer
                       hover:bg-graphite-800/40 transition-colors duration-200"
            style={{ minHeight: '320px' }}
            aria-label="Click or drag to upload image"
          >
            <div className={`w-14 h-14 rounded-xl border flex items-center justify-center
                             transition-all duration-300
                             ${dragOver
                               ? 'border-lime-400/60 bg-lime-400/10'
                               : 'border-white/[0.08] bg-graphite-800'}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                   className={`transition-colors ${dragOver ? 'text-lime-400' : 'text-white/40'}`}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="17 8 12 3 7 8"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="3" x2="12" y2="15"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="font-mono text-sm text-white/60 mb-1">
                {dragOver ? 'Drop to upload' : 'Drag image here or'}
              </p>
              {!dragOver && (
                <span className="label-tech text-lime-400/60 uppercase hover:text-lime-400 transition-colors">
                  Click to browse
                </span>
              )}
            </div>
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/[0.08] border border-red-500/20 animate-fade-in">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-red-400 mt-0.5 flex-shrink-0">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M7 4.5v3M7 9.5h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <p className="text-red-400 text-xs font-mono">{error}</p>
        </div>
      )}

      {/* Question input */}
      <div>
        <label htmlFor="analyze-question" className="label-tech mb-2 block">
          Your question (optional)
        </label>
        <input
          id="analyze-question"
          type="text"
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          placeholder="What should I do next?"
          className="w-full bg-graphite-800 border border-white/[0.08] rounded-xl px-4 py-3
                     text-white/80 text-sm placeholder:text-white/20 font-mono
                     focus:outline-none focus:border-lime-400/30
                     transition-all duration-200"
          disabled={isAnalyzing}
        />
      </div>

      {/* Analyze CTA */}
      {image && (
        <button
          id="analyze-button"
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="btn-primary w-full animate-fade-in"
        >
          {isAnalyzing ? (
            <>
              <span className="w-3 h-3 border border-graphite-950/40 border-t-graphite-950
                               rounded-full animate-spin" />
              ANALYZING...
            </>
          ) : (
            <>
              ANALYZE REALITY
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </>
          )}
        </button>
      )}
    </div>
  );
}
