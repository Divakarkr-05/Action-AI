/**
 * Dashboard UX & Diagnostic State Machine Logic
 *
 * Implements:
 * - Dynamic CTA priority logic (No active case -> Start New; Active case -> Continue; Awaiting test -> Submit test; etc.)
 * - 7-day case expiration formatting
 * - Diagnostic progress step calculations (OBSERVE, IDENTIFY, DIAGNOSE, TEST, REPAIR, VERIFY)
 * - Intelligent case sorting by urgency
 * - Image quality guidance microcopy
 */

import type { DiagnosticCase, DiagnosticState, ImageQualityAssessment } from '../types';

export interface DynamicCTA {
  label: string;
  actionType: 'START_NEW' | 'CONTINUE' | 'SUBMIT_TEST' | 'CONTINUE_REPAIR' | 'VERIFY_REPAIR';
  headline: string;
  subtext: string;
}

/**
 * Returns dynamic greeting based on local time
 */
export function getGreeting(date: Date = new Date()): string {
  const hours = date.getHours();
  if (hours < 12) return 'Good morning.';
  if (hours < 17) return 'Good afternoon.';
  return 'Good evening.';
}

/**
 * Calculates dynamic CTA based on user's current diagnostic state
 */
export function getDashboardCTA(activeCase: DiagnosticCase | null): DynamicCTA {
  if (!activeCase) {
    return {
      label: 'Start New Diagnosis',
      actionType: 'START_NEW',
      headline: 'What do you want to diagnose?',
      subtext: 'Upload a photo of a PCB, component, circuit, machine, or diagram and we will guide you through the investigation.',
    };
  }

  const state = activeCase.currentState;

  if (state === 'AWAITING_TEST' || state === 'TEST_TO_KNOW') {
    return {
      label: 'Submit Test Result',
      actionType: 'SUBMIT_TEST',
      headline: `Awaiting test on ${activeCase.title}`,
      subtext: activeCase.activeTest
        ? `Perform test: ${activeCase.activeTest.title}`
        : 'Take a multimeter measurement to distinguish the remaining failure hypotheses.',
    };
  }

  if (state === 'REPAIR') {
    return {
      label: 'Continue Repair',
      actionType: 'CONTINUE_REPAIR',
      headline: `Ready for repair on ${activeCase.title}`,
      subtext: 'Follow the guided repair procedure and counterfactual component replacement.',
    };
  }

  if (state === 'VERIFY') {
    return {
      label: 'Verify Repair',
      actionType: 'VERIFY_REPAIR',
      headline: `Verify repair on ${activeCase.title}`,
      subtext: 'Upload a post-repair photo to verify visual and electrical restoration.',
    };
  }

  if (state === 'RESOLVED') {
    return {
      label: 'Start New Diagnosis',
      actionType: 'START_NEW',
      headline: 'Previous diagnosis resolved',
      subtext: 'Case completed and verified. Start a new investigation whenever you are ready.',
    };
  }

  return {
    label: 'Continue Diagnosis',
    actionType: 'CONTINUE',
    headline: `Continue ${activeCase.title}`,
    subtext: `Current stage: ${state.replace(/_/g, ' ')}. Investigation is in progress.`,
  };
}

/**
 * Format 7-day TTL case expiration human-readably
 */
export function formatCaseExpiry(expiresAtStr: string, now: number = Date.now()): {
  text: string;
  isUrgent: boolean;
  isExpired: boolean;
} {
  const expires = new Date(expiresAtStr).getTime();
  const diffMs = expires - now;

  if (diffMs <= 0) {
    return { text: 'Expired', isUrgent: true, isExpired: true };
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays >= 2) {
    return { text: `Expires in ${diffDays} days`, isUrgent: false, isExpired: false };
  }

  if (diffDays === 1) {
    return { text: 'Expires tomorrow', isUrgent: true, isExpired: false };
  }

  if (diffHours >= 1) {
    return { text: `Expires in ${diffHours} hours`, isUrgent: true, isExpired: false };
  }

  const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  return { text: `Expires in ${diffMins} minutes`, isUrgent: true, isExpired: false };
}

export interface DiagnosticStep {
  id: string;
  label: string;
  status: 'COMPLETE' | 'CURRENT' | 'UPCOMING';
}

/**
 * Maps granular 11-stage state to user-friendly 6-phase diagnostic progress:
 * OBSERVE -> IDENTIFY -> DIAGNOSE -> TEST -> REPAIR -> VERIFY
 */
export function getDiagnosticSteps(state: DiagnosticState): DiagnosticStep[] {
  const order: DiagnosticStep[] = [
    { id: 'OBSERVE', label: 'Observe', status: 'UPCOMING' },
    { id: 'IDENTIFY', label: 'Identify', status: 'UPCOMING' },
    { id: 'DIAGNOSE', label: 'Diagnose', status: 'UPCOMING' },
    { id: 'TEST', label: 'Test', status: 'UPCOMING' },
    { id: 'REPAIR', label: 'Repair', status: 'UPCOMING' },
    { id: 'VERIFY', label: 'Verify', status: 'UPCOMING' },
  ];

  let currentIndex = 0;
  switch (state) {
    case 'OBSERVE':
      currentIndex = 0;
      break;
    case 'IDENTIFY':
      currentIndex = 1;
      break;
    case 'HYPOTHESIZE':
    case 'SAFETY_CHECK':
      currentIndex = 2;
      break;
    case 'TEST_TO_KNOW':
    case 'AWAITING_TEST':
    case 'INTERPRET_RESULT':
    case 'NEXT_ACTION':
      currentIndex = 3;
      break;
    case 'REPAIR':
      currentIndex = 4;
      break;
    case 'VERIFY':
    case 'RESOLVED':
      currentIndex = 5;
      break;
  }

  return order.map((step, idx) => {
    if (state === 'RESOLVED') {
      return { ...step, status: 'COMPLETE' };
    }
    if (idx < currentIndex) {
      return { ...step, status: 'COMPLETE' };
    }
    if (idx === currentIndex) {
      return { ...step, status: 'CURRENT' };
    }
    return { ...step, status: 'UPCOMING' };
  });
}

/**
 * Sorts cases intelligently by actionable urgency:
 * 1. Awaiting user action (AWAITING_TEST, TEST_TO_KNOW)
 * 2. In-progress (REPAIR, VERIFY, HYPOTHESIZE)
 * 3. Recently updated
 * 4. Resolved
 */
export function sortDiagnosticCases(cases: DiagnosticCase[]): DiagnosticCase[] {
  return [...cases].sort((a, b) => {
    const priority = (c: DiagnosticCase): number => {
      if (c.currentState === 'AWAITING_TEST' || c.currentState === 'TEST_TO_KNOW') return 0;
      if (c.currentState === 'REPAIR' || c.currentState === 'VERIFY') return 1;
      if (c.currentState !== 'RESOLVED') return 2;
      return 3;
    };

    const prioDiff = priority(a) - priority(b);
    if (prioDiff !== 0) return prioDiff;

    const timeA = new Date(a.updatedAt || a.createdAt).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt).getTime();
    return timeB - timeA;
  });
}

/**
 * Intelligent image quality feedback microcopy
 */
export function getSmartUploadGuidance(quality?: ImageQualityAssessment | null): {
  status: 'GOOD' | 'NEEDS_BETTER_IMAGE';
  message: string;
  tip: string;
} {
  if (!quality || quality.overall === 'SUFFICIENT') {
    return {
      status: 'GOOD',
      message: 'Image quality is good for diagnostic inspection.',
      tip: 'Component markings and trace features are sharp and usable.',
    };
  }

  if (quality.focus === 'BAD' || quality.focus === 'WARNING') {
    return {
      status: 'NEEDS_BETTER_IMAGE',
      message: 'Your image is usable, but slight optical blur makes fine traces harder to inspect.',
      tip: 'Hold the camera steady or rest it on a flat surface for maximum sharpness.',
    };
  }

  if (quality.glare === 'BAD' || quality.glare === 'WARNING') {
    return {
      status: 'NEEDS_BETTER_IMAGE',
      message: 'Reflective glare on solder pads or IC packages obscures component text.',
      tip: 'Tilt the board slightly away from direct overhead light to eliminate specular reflection.',
    };
  }

  return {
    status: 'NEEDS_BETTER_IMAGE',
    message: quality.guidance || 'Your image is usable, but the component area is difficult to inspect.',
    tip: 'Try taking a closer photo with direct, even lighting and less glare.',
  };
}
