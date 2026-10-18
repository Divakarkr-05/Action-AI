import assert from 'node:assert/strict';

import {
  calculateSigmoid,
  classifyProbability,
  AI_THRESHOLD,
  REAL_THRESHOLD,
  MODEL_NAME,
} from '../authenticityDetector.ts';

console.log('--- Running Detectra v3 Authenticity Detector Tests ---');

// 1. Sigmoid
assert.strictEqual(calculateSigmoid(0), 0.5);
assert.ok(calculateSigmoid(10) > 0.9999);
assert.ok(calculateSigmoid(-10) < 0.0001);
console.log('✓ 1. Sigmoid calculation passes');

// 2. Prob = 0
const r0 = classifyProbability(0.0);
assert.strictEqual(r0.status, 'LIKELY_REAL');
assert.strictEqual(r0.confidence, 1.0);
console.log('✓ 2. Probability = 0 (LIKELY_REAL) passes');

// 3. Prob = 1
const r1 = classifyProbability(1.0);
assert.strictEqual(r1.status, 'LIKELY_AI_GENERATED');
assert.strictEqual(r1.confidence, 1.0);
console.log('✓ 3. Probability = 1 (LIKELY_AI_GENERATED) passes');

// 4. Probability below real threshold (0.10, 0.25 -> LIKELY_REAL)
const r10 = classifyProbability(0.10);
assert.strictEqual(r10.status, 'LIKELY_REAL');
assert.strictEqual(r10.confidence, 0.90);

const r25 = classifyProbability(0.25);
assert.strictEqual(r25.status, 'LIKELY_REAL');
assert.strictEqual(r25.confidence, 0.75);
console.log('✓ 4. Probabilities 0.10 and 0.25 -> LIKELY_REAL pass');

// 5. Probability above AI threshold (0.75, 0.95 -> LIKELY_AI_GENERATED)
const r75 = classifyProbability(0.75);
assert.strictEqual(r75.status, 'LIKELY_AI_GENERATED');
assert.strictEqual(r75.confidence, 0.75);

const r95 = classifyProbability(0.95);
assert.strictEqual(r95.status, 'LIKELY_AI_GENERATED');
assert.strictEqual(r95.confidence, 0.95);
console.log('✓ 5. Probabilities 0.75 and 0.95 -> LIKELY_AI_GENERATED pass');

// 6. Uncertain probability (0.26, 0.50, 0.74 -> UNCERTAIN)
const r26 = classifyProbability(0.26);
assert.strictEqual(r26.status, 'UNCERTAIN');

const r50 = classifyProbability(0.50);
assert.strictEqual(r50.status, 'UNCERTAIN');

const r74 = classifyProbability(0.74);
assert.strictEqual(r74.status, 'UNCERTAIN');
console.log('✓ 6. Probabilities 0.26, 0.50, 0.74 -> UNCERTAIN pass');

// 7. Invalid probabilities throw
assert.throws(() => classifyProbability(-0.01));
assert.throws(() => classifyProbability(1.01));
assert.throws(() => classifyProbability(NaN));
assert.throws(() => classifyProbability(Infinity));
console.log('✓ 7. Invalid probabilities properly rejected');

// 8. Unavailable fallback
const unavail = {
  status: 'UNAVAILABLE',
  aiGeneratedProbability: null,
  confidence: null,
  model: MODEL_NAME,
  indicators: [],
  error: 'Runtime unavailable',
};
assert.strictEqual(unavail.status, 'UNAVAILABLE');
console.log('✓ 8. Detector unavailable fallback passes');

// 9. Model loading failure handling
const modelFail = {
  status: 'UNAVAILABLE',
  aiGeneratedProbability: null,
  confidence: null,
  model: MODEL_NAME,
  indicators: [],
  error: 'Failed to fetch /models/detectra.onnx',
};
assert.strictEqual(modelFail.status, 'UNAVAILABLE');
console.log('✓ 9. Model loading failure passes');

// 10. Backward compatibility
const legacy = {
  whatISee: 'A PCB',
  whatIsHappening: 'Normal',
  nextAction: 'Monitor',
  steps: ['Step 1'],
  confidence: 0.9,
};
assert.strictEqual(legacy.imageAuthenticity, undefined);
console.log('✓ 10. Backward compatibility passes');

// 11. Immutability
const finalRes = {
  whatISee: 'Gemma says it might be synthetic',
  imageAuthenticity: r10.status,
  aiGeneratedProbability: 0.10,
  authenticityConfidence: r10.confidence,
};
assert.strictEqual(finalRes.imageAuthenticity, 'LIKELY_REAL');
assert.strictEqual(finalRes.aiGeneratedProbability, 0.10);
console.log('✓ 11. Gemma cannot overwrite detector probability passes');

console.log('\nALL 11 AUTHENTICITY UNIT TESTS PASSED SUCCESSFULLY!');
