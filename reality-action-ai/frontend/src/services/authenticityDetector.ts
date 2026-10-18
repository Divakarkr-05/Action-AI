/**
 * REALITY → ACTION AI – Authenticity Detector Service
 *
 * Runs Detectra v3 (TensorFold/detectra-v1) locally in the browser
 * using onnxruntime-web via WebGPU with WASM fallback.
 *
 * Pipeline:
 *   Image
 *     ↓
 *   Resize shortest edge to 440px
 *     ↓
 *   Center crop to 384x384
 *     ↓
 *   ImageNet Normalization (mean: [0.485, 0.456, 0.406], std: [0.229, 0.224, 0.225])
 *     ↓
 *   ONNX Inference (pixel_values: 1x3x384x384 float32)
 *     ↓
 *   Logit -> Sigmoid -> AI Probability
 *     ↓
 *   Classification (LIKELY_REAL, LIKELY_AI_GENERATED, UNCERTAIN, UNAVAILABLE)
 */

import * as ort from 'onnxruntime-web';

// ── Configurable Product Thresholds ──────────────────────────────────────────

export const AI_THRESHOLD = 0.75;
export const REAL_THRESHOLD = 0.25;
export const MODEL_NAME = 'Detectra v3';
export const MODEL_PATH = '/models/detectra.onnx';

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
  error: string | null;
}

// ── Pure Math & Classification Functions ────────────────────────────────────

/**
 * Convert raw logit to probability using standard sigmoid function:
 *   probability = 1 / (1 + exp(-logit))
 */
export function calculateSigmoid(logit: number): number {
  if (typeof logit !== 'number' || isNaN(logit)) {
    throw new Error('Logit must be a valid number');
  }
  return 1 / (1 + Math.exp(-logit));
}

/**
 * Classify AI probability using configurable product thresholds.
 *
 * probability >= 0.75 -> LIKELY_AI_GENERATED
 * probability <= 0.25 -> LIKELY_REAL
 * 0.25 < probability < 0.75 -> UNCERTAIN
 */
export function classifyProbability(
  probability: number,
  aiThreshold = AI_THRESHOLD,
  realThreshold = REAL_THRESHOLD,
): { status: AuthenticityStatus; confidence: number } {
  if (
    typeof probability !== 'number' ||
    isNaN(probability) ||
    !isFinite(probability) ||
    probability < 0 ||
    probability > 1
  ) {
    throw new Error('Invalid probability value: must be between 0 and 1.');
  }

  const roundedProb = Math.round(probability * 1000) / 1000;

  if (roundedProb >= aiThreshold) {
    return {
      status: 'LIKELY_AI_GENERATED',
      confidence: Math.round(roundedProb * 100) / 100,
    };
  }

  if (roundedProb <= realThreshold) {
    return {
      status: 'LIKELY_REAL',
      confidence: Math.round((1 - roundedProb) * 100) / 100,
    };
  }

  return {
    status: 'UNCERTAIN',
    confidence: Math.round(Math.max(roundedProb, 1 - roundedProb) * 100) / 100,
  };
}

// ── Image Preprocessing ─────────────────────────────────────────────────────

/**
 * Preprocesses an image according to Detectra v3 specifications:
 * 1. Resize shortest edge to 440 pixels (preserving aspect ratio)
 * 2. Center crop to 384 x 384
 * 3. Convert pixels to [0, 1]
 * 4. Apply ImageNet normalization:
 *      mean: [0.485, 0.456, 0.406]
 *      std:  [0.229, 0.224, 0.225]
 * 5. Return NCHW Float32Array [1, 3, 384, 384]
 */
export async function preprocessImage(
  imageSrc: string | HTMLImageElement | ImageBitmap,
): Promise<Float32Array> {
  let img: HTMLImageElement | ImageBitmap;

  if (typeof imageSrc === 'string') {
    img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error('Failed to load image for authenticity check.'));
      image.src = imageSrc;
    });
  } else {
    img = imageSrc;
  }

  const width = img.width;
  const height = img.height;

  if (!width || !height) {
    throw new Error('Image has zero dimensions.');
  }

  // 1. Resize shortest edge to 440px
  let targetWidth: number;
  let targetHeight: number;
  if (width < height) {
    targetWidth = 440;
    targetHeight = Math.round((height * 440) / width);
  } else {
    targetHeight = 440;
    targetWidth = Math.round((width * 440) / height);
  }

  // Create canvas for scaling
  let canvas: HTMLCanvasElement | OffscreenCanvas;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(targetWidth, targetHeight);
  } else if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  } else {
    throw new Error('Canvas rendering environment not available.');
  }

  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;

  if (!ctx) {
    throw new Error('Canvas 2D context could not be acquired.');
  }

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // 2. Center crop to 384 x 384
  const cropSize = 384;
  const startX = Math.max(0, Math.floor((targetWidth - cropSize) / 2));
  const startY = Math.max(0, Math.floor((targetHeight - cropSize) / 2));

  const imageData = ctx.getImageData(startX, startY, cropSize, cropSize);
  const data = imageData.data; // RGBA uint8

  // 3. Normalization and NCHW ordering
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];
  const numPixels = cropSize * cropSize;
  const float32Data = new Float32Array(3 * numPixels);

  const rOffset = 0;
  const gOffset = numPixels;
  const bOffset = 2 * numPixels;

  for (let i = 0; i < numPixels; i++) {
    const srcIndex = i * 4;
    const r = data[srcIndex] / 255.0;
    const g = data[srcIndex + 1] / 255.0;
    const b = data[srcIndex + 2] / 255.0;

    float32Data[rOffset + i] = (r - mean[0]) / std[0];
    float32Data[gOffset + i] = (g - mean[1]) / std[1];
    float32Data[bOffset + i] = (b - mean[2]) / std[2];
  }

  return float32Data;
}

// ── ONNX Session Management (Lazy load & Cache) ─────────────────────────────

let cachedSession: ort.InferenceSession | null = null;
let sessionLoadingPromise: Promise<ort.InferenceSession | null> | null = null;
const resultCache = new Map<string, ImageAuthenticityResult>();

export async function getDetectorSession(): Promise<ort.InferenceSession | null> {
  if (cachedSession) return cachedSession;
  if (sessionLoadingPromise) return sessionLoadingPromise;

  sessionLoadingPromise = (async () => {
    try {
      // Configure onnxruntime-web WASM fallback paths
      if (typeof window !== 'undefined' && ort.env?.wasm) {
        ort.env.wasm.wasmPaths =
          'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';
        ort.env.wasm.numThreads = 1;
      }

      // 1. Try WebGPU first
      try {
        if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
          const session = await ort.InferenceSession.create(MODEL_PATH, {
            executionProviders: ['webgpu'],
            graphOptimizationLevel: 'all',
          });
          cachedSession = session;
          return session;
        }
      } catch (gpuErr) {
        console.warn('WebGPU execution provider failed, falling back to WASM:', gpuErr);
      }

      // 2. Fallback to WASM
      try {
        const session = await ort.InferenceSession.create(MODEL_PATH, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        });
        cachedSession = session;
        return session;
      } catch (wasmErr) {
        console.warn('WASM execution provider failed:', wasmErr);
      }

      return null;
    } catch (err) {
      console.error('Failed to load Detectra ONNX session:', err);
      return null;
    } finally {
      sessionLoadingPromise = null;
    }
  })();

  return sessionLoadingPromise;
}

// ── Main Detection API ──────────────────────────────────────────────────────

/**
 * Run AI authenticity check on an image.
 *
 * Guarantees:
 * - Returns structured ImageAuthenticityResult
 * - Never throws unhandled errors that break the app (falls back to UNAVAILABLE)
 * - Caches identical requests
 * - Never fabricates indicators
 */
export async function detectImageAuthenticity(
  imageSrc: string | HTMLImageElement | ImageBitmap,
  cacheKey?: string,
): Promise<ImageAuthenticityResult> {
  const key =
    cacheKey ||
    (typeof imageSrc === 'string'
      ? `${imageSrc.slice(0, 80)}_${imageSrc.length}`
      : null);

  if (key && resultCache.has(key)) {
    return resultCache.get(key)!;
  }

  try {
    const session = await getDetectorSession();
    if (!session) {
      const unavailableResult: ImageAuthenticityResult = {
        status: 'UNAVAILABLE',
        aiGeneratedProbability: null,
        confidence: null,
        model: MODEL_NAME,
        indicators: [],
        error: 'Inference runtime is not available in this browser.',
      };
      if (key) resultCache.set(key, unavailableResult);
      return unavailableResult;
    }

    const inputData = await preprocessImage(imageSrc);
    const tensor = new ort.Tensor('float32', inputData, [1, 3, 384, 384]);
    const feeds: Record<string, ort.Tensor> = {
      [session.inputNames[0] || 'pixel_values']: tensor,
    };

    const results = await session.run(feeds);
    const outputName = session.outputNames[0] || 'logit';
    const outputTensor = results[outputName];

    if (!outputTensor || !outputTensor.data || outputTensor.data.length === 0) {
      throw new Error('Model returned an empty output tensor.');
    }

    const logit = Number(outputTensor.data[0]);
    const probability = calculateSigmoid(logit);
    const { status, confidence } = classifyProbability(probability);

    const result: ImageAuthenticityResult = {
      status,
      aiGeneratedProbability: Math.round(probability * 1000) / 1000,
      confidence,
      model: MODEL_NAME,
      indicators: ['Model-based classification'],
      error: null,
    };

    if (key) {
      resultCache.set(key, result);
    }
    return result;
  } catch (err) {
    console.warn('Authenticity detection encountered an error:', err);
    const fallbackResult: ImageAuthenticityResult = {
      status: 'UNAVAILABLE',
      aiGeneratedProbability: null,
      confidence: null,
      model: MODEL_NAME,
      indicators: [],
      error:
        err instanceof Error
          ? err.message
          : 'Authenticity check could not be completed.',
    };
    return fallbackResult;
  }
}
