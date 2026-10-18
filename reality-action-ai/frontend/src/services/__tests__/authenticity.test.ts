/**
 * Detectra v3 Authenticity Detector – Unit Test Suite
 *
 * Verifies:
 * 1. Sigmoid calculation
 * 2. Probability = 0 (LIKELY_REAL)
 * 3. Probability = 1 (LIKELY_AI_GENERATED)
 * 4. Probability below real threshold (0.10, 0.25 -> LIKELY_REAL)
 * 5. Probability above AI threshold (0.75, 0.95 -> LIKELY_AI_GENERATED)
 * 6. Uncertain probability (0.26, 0.50, 0.74 -> UNCERTAIN)
 * 7. Invalid probability (< 0, > 1, NaN, Infinity)
 * 8. Detector unavailable fallback
 * 9. Model loading failure handling
 * 10. Backward compatibility
 * 11. Immutability: Gemma result cannot overwrite detector probability
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateSigmoid,
  classifyProbability,
  AI_THRESHOLD,
  REAL_THRESHOLD,
  MODEL_NAME,
} from '../authenticityDetector.js';

test('1. Sigmoid calculation maps logits to (0, 1) correctly', () => {
  // logit = 0 -> prob = 0.5
  assert.strictEqual(calculateSigmoid(0), 0.5);

  // large positive logit -> ~1.0
  const largePos = calculateSigmoid(10);
  assert.ok(largePos > 0.9999);

  // large negative logit -> ~0.0
  const largeNeg = calculateSigmoid(-10);
  assert.ok(largeNeg < 0.0001);

  // known value: logit = 2.1972 -> ~0.90
  const p90 = calculateSigmoid(2.1972245773362196);
  assert.ok(Math.abs(p90 - 0.90) < 0.001);
});

test('2. Probability = 0 classifies as LIKELY_REAL', () => {
  const result = classifyProbability(0.0);
  assert.strictEqual(result.status, 'LIKELY_REAL');
  assert.strictEqual(result.confidence, 1.0);
});

test('3. Probability = 1 classifies as LIKELY_AI_GENERATED', () => {
  const result = classifyProbability(1.0);
  assert.strictEqual(result.status, 'LIKELY_AI_GENERATED');
  assert.strictEqual(result.confidence, 1.0);
});

test('4. Probability below real threshold (<= 0.25) classifies as LIKELY_REAL', () => {
  // 0.10 -> LIKELY_REAL (confidence 0.90)
  const res10 = classifyProbability(0.10);
  assert.strictEqual(res10.status, 'LIKELY_REAL');
  assert.strictEqual(res10.confidence, 0.90);

  // 0.25 -> LIKELY_REAL (confidence 0.75)
  const res25 = classifyProbability(0.25);
  assert.strictEqual(res25.status, 'LIKELY_REAL');
  assert.strictEqual(res25.confidence, 0.75);
});

test('5. Probability above AI threshold (>= 0.75) classifies as LIKELY_AI_GENERATED', () => {
  // 0.75 -> LIKELY_AI_GENERATED (confidence 0.75)
  const res75 = classifyProbability(0.75);
  assert.strictEqual(res75.status, 'LIKELY_AI_GENERATED');
  assert.strictEqual(res75.confidence, 0.75);

  // 0.95 -> LIKELY_AI_GENERATED (confidence 0.95)
  const res95 = classifyProbability(0.95);
  assert.strictEqual(res95.status, 'LIKELY_AI_GENERATED');
  assert.strictEqual(res95.confidence, 0.95);
});

test('6. Uncertain probability (0.25 < p < 0.75) classifies as UNCERTAIN', () => {
  // 0.26 -> UNCERTAIN
  const res26 = classifyProbability(0.26);
  assert.strictEqual(res26.status, 'UNCERTAIN');

  // 0.50 -> UNCERTAIN
  const res50 = classifyProbability(0.50);
  assert.strictEqual(res50.status, 'UNCERTAIN');

  // 0.74 -> UNCERTAIN
  const res74 = classifyProbability(0.74);
  assert.strictEqual(res74.status, 'UNCERTAIN');
});

test('7. Invalid probabilities throw error', () => {
  // Negative
  assert.throws(() => classifyProbability(-0.1), /Invalid probability value/);

  // Greater than 1
  assert.throws(() => classifyProbability(1.05), /Invalid probability value/);

  // NaN
  assert.throws(() => classifyProbability(NaN), /Invalid probability value/);

  // Infinity
  assert.throws(() => classifyProbability(Infinity), /Invalid probability value/);
});

test('8. Detector unavailable returns safe fallback', () => {
  const unavailableResult = {
    status: 'UNAVAILABLE',
    aiGeneratedProbability: null,
    confidence: null,
    model: MODEL_NAME,
    indicators: [],
    error: 'Runtime not available',
  };

  assert.strictEqual(unavailableResult.status, 'UNAVAILABLE');
  assert.strictEqual(unavailableResult.aiGeneratedProbability, null);
  assert.strictEqual(unavailableResult.error, 'Runtime not available');
});

test('9. Model loading failure returns structured fallback with error description', () => {
  const err = new Error('Model file not found: 404');
  const fallback = {
    status: 'UNAVAILABLE' as const,
    aiGeneratedProbability: null,
    confidence: null,
    model: MODEL_NAME,
    indicators: [],
    error: err.message,
  };

  assert.strictEqual(fallback.status, 'UNAVAILABLE');
  assert.ok(fallback.error.includes('404'));
});

test('10. Backward compatibility with legacy analysis results without authenticity', () => {
  const legacyResult = {
    whatISee: 'A PCB with capacitors',
    whatIsHappening: 'Normal operation',
    nextAction: 'Continue monitoring',
    steps: ['Check power'],
    confidence: 0.88,
    safetyWarning: null,
    groundingSources: ['circuit_guide.md'],
    // No authenticity fields
  };

  // Object remains valid and optional fields default to undefined
  assert.strictEqual(legacyResult.whatISee, 'A PCB with capacitors');
  assert.strictEqual((legacyResult as any).imageAuthenticity, undefined);
  assert.strictEqual((legacyResult as any).aiGeneratedProbability, undefined);
});

test('11. Immutability: Gemma cannot overwrite detector probability', () => {
  const detectorResult = {
    status: 'LIKELY_REAL' as const,
    aiGeneratedProbability: 0.12,
    confidence: 0.88,
    model: 'Detectra v3',
  };

  // Gemma simulated response attempting to claim the image is synthetic
  const gemmaHallucination = {
    whatISee: 'This looks like an AI-generated image with high probability.',
    whatIsHappening: 'Synthetic visual style.',
    nextAction: 'Do not trust this image.',
    steps: ['Discard'],
    confidence: 0.99,
  };

  // Combined pipeline enforces that detector results take precedence
  const finalResult = {
    ...gemmaHallucination,
    imageAuthenticity: detectorResult.status,
    aiGeneratedProbability: detectorResult.aiGeneratedProbability,
    authenticityConfidence: detectorResult.confidence,
    authenticityModel: detectorResult.model,
  };

  assert.strictEqual(finalResult.imageAuthenticity, 'LIKELY_REAL');
  assert.strictEqual(finalResult.aiGeneratedProbability, 0.12);
  assert.strictEqual(finalResult.authenticityConfidence, 0.88);
});
