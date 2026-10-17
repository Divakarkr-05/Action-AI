/**
 * CameraCapture – Uses browser MediaDevices API to capture an image.
 * Falls back gracefully when camera is not available.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ImageFile } from '../types';

interface CameraCaptureProps {
  onCapture: (img: ImageFile) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);

  // ── Start stream ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error && err.name === 'NotAllowedError'
              ? 'Camera access was denied. Please allow camera access and try again.'
              : 'Camera is not available on this device or browser.',
          );
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── Capture frame ────────────────────────────────────────────────────────
  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCaptured(dataUrl);

    // Stop stream after capture
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  // ── Accept captured image ────────────────────────────────────────────────
  const accept = useCallback(() => {
    if (!captured) return;
    const sizeEstimate = Math.round((captured.length * 0.75) / 1024);
    onCapture({
      file: new File([], 'camera-capture.jpg', { type: 'image/jpeg' }),
      dataUrl: captured,
      name: 'camera-capture.jpg',
      sizeKb: sizeEstimate,
      type: 'image/jpeg',
    });
    onClose();
  }, [captured, onCapture, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-graphite-950/95 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl mx-4 bg-graphite-900 border border-white/[0.08] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <span className="section-title mb-0">Camera Capture</span>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="relative bg-graphite-950 aspect-video">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-red-400/60">
                <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M16 10v6M16 21h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <p className="text-white/50 text-sm font-mono">{error}</p>
            </div>
          ) : captured ? (
            <img src={captured} alt="Captured" className="w-full h-full object-contain" />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Scan line overlay */}
              {ready && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute left-0 right-0 h-px bg-lime-400/20 animate-scan" />
                  {/* Corner brackets */}
                  {[['top-3 left-3','border-t border-l'],['top-3 right-3','border-t border-r'],
                    ['bottom-3 left-3','border-b border-l'],['bottom-3 right-3','border-b border-r']].map(([pos, border], i) => (
                    <div key={i} className={`absolute ${pos} w-6 h-6 ${border} border-lime-400/40`} />
                  ))}
                </div>
              )}
              {!ready && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 border border-lime-400/30 border-t-lime-400 rounded-full animate-spin" />
                </div>
              )}
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-center gap-3 p-4 border-t border-white/[0.06]">
          {!captured ? (
            <button
              onClick={capture}
              disabled={!ready || !!error}
              className="btn-primary"
              id="camera-capture-btn"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 4.5A1.5 1.5 0 012.5 3h.5L4 1.5h6L11 3h.5A1.5 1.5 0 0113 4.5v6A1.5 1.5 0 0111.5 12h-9A1.5 1.5 0 011 10.5v-6z"
                  stroke="currentColor" strokeWidth="1.2" fill="none"/>
                <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
              CAPTURE
            </button>
          ) : (
            <>
              <button onClick={() => { setCaptured(null); }} className="btn-ghost">RETAKE</button>
              <button onClick={accept} className="btn-primary" id="camera-accept-btn">USE THIS PHOTO →</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
