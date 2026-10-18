import type { DiagnosticCase, FaultBox, IdentifiedComponent } from '../types';

export interface NormalizedFault {
  id: string;
  title: string;
  component: string;
  reference_designator: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  confidence: number;
  identity_confidence?: number;
  location_confidence?: number;
  observed_evidence: string[];
  inferred_diagnosis: string;
  unknowns: string[];
  location: string;
  next_inspection?: string;
  rawFaultBox?: FaultBox;
}

export interface NormalizedDiagnosticResult {
  faults: NormalizedFault[];
  primaryFault: NormalizedFault | null;
  activeComponent: IdentifiedComponent | null;
  observedEvidence: string[];
  inferredEvidence: string[];
  unknownEvidence: string[];
}

/**
 * Normalizes backend DiagnosticCase data into a single canonical source of truth.
 *
 * Rules:
 * 1. Deduplicates faults having same reference_designator + normalized diagnosis.
 * 2. Merges component metadata (marking, componentType) with visual fault boxes.
 * 3. Keeps observed physical facts strictly separated from inferred deductions.
 * 4. Ensures confidence values are single-sourced and labeled when multi-dimensional.
 */
export function normalizeDiagnostic(diagnosticCase: DiagnosticCase): NormalizedDiagnosticResult {
  const seenKeys = new Set<string>();
  const normalizedFaults: NormalizedFault[] = [];

  const rawFaults = diagnosticCase.faultBoxes || [];
  const components = diagnosticCase.identifiedComponents || [];

  // Categorized evidence lists from canonical case evidence
  const observedFromCase = (diagnosticCase.evidence || [])
    .filter((e) => e.evidenceType === 'OBSERVED')
    .map((e) => e.claim);
  const inferredFromCase = (diagnosticCase.evidence || [])
    .filter((e) => e.evidenceType === 'INFERRED')
    .map((e) => e.claim);
  const unknownFromCase = (diagnosticCase.evidence || [])
    .filter((e) => e.evidenceType === 'UNKNOWN')
    .map((e) => e.claim);

  for (let i = 0; i < rawFaults.length; i++) {
    const fb = rawFaults[i];
    const refDesig = fb.component?.trim() || '—';
    const defectClean = (fb.defect || fb.label || '').trim().toLowerCase();

    // Deduplication identity: prefer fb.id, fallback to refDesig + normalized defect
    const dedupeKey = fb.id ? fb.id : `${refDesig.toLowerCase()}__${defectClean}`;
    if (seenKeys.has(dedupeKey)) {
      continue;
    }
    seenKeys.add(dedupeKey);

    // Also guard against secondary duplicate with same refDesig & similar defect
    const semanticKey = `${refDesig.toLowerCase()}__${defectClean.slice(0, 15)}`;
    if (seenKeys.has(semanticKey)) {
      continue;
    }
    seenKeys.add(semanticKey);

    // Match with identified component
    const matchedComp = components.find(
      (c) =>
        c.referenceDesignator?.toLowerCase() === refDesig.toLowerCase() ||
        c.id === fb.id,
    );

    const componentLabel =
      matchedComp?.componentType ||
      (refDesig !== '—' ? refDesig : 'Identified Component');

    const observed =
      fb.observedEvidence && fb.observedEvidence.length > 0
        ? fb.observedEvidence
        : observedFromCase.slice(0, 3);

    const inferred =
      fb.inferredInterpretation ||
      (inferredFromCase.length > 0 ? inferredFromCase[0] : 'Appearance is consistent with component degradation');

    const unknowns =
      fb.unknowns && fb.unknowns.length > 0
        ? fb.unknowns
        : unknownFromCase.slice(0, 2);

    normalizedFaults.push({
      id: fb.id || `fault_${i + 1}`,
      title: fb.defect || fb.label || 'Physical defect detected',
      component: componentLabel,
      reference_designator: refDesig,
      severity: fb.severity || 'WARNING',
      confidence: typeof fb.confidence === 'number' ? fb.confidence : 0.85,
      identity_confidence: matchedComp?.identityConfidence,
      location_confidence: matchedComp?.locationConfidence,
      observed_evidence: observed,
      inferred_diagnosis: inferred,
      unknowns,
      location: refDesig !== '—' ? refDesig : 'Inspected location',
      next_inspection:
        fb.recommendedInspection ||
        'Inspect underside PCB traces and verify adjacent passive components',
      rawFaultBox: fb,
    });
  }

  // If no fault boxes came from backend, generate single fallback normalized fault if components exist
  if (normalizedFaults.length === 0 && components.length > 0) {
    const comp = components[0];
    normalizedFaults.push({
      id: 'fault_1',
      title: diagnosticCase.title || 'Component visual anomaly',
      component: comp.componentType || 'Component',
      reference_designator: comp.referenceDesignator || '—',
      severity: 'WARNING',
      confidence: comp.defectConfidence || 0.85,
      identity_confidence: comp.identityConfidence,
      location_confidence: comp.locationConfidence,
      observed_evidence: observedFromCase,
      inferred_diagnosis:
        inferredFromCase[0] || 'Appearance is consistent with component degradation',
      unknowns: unknownFromCase,
      location: comp.referenceDesignator || 'Inspected location',
      next_inspection: 'Perform diagnostic test to confirm electrical viability',
    });
  }

  const primaryFault = normalizedFaults.length > 0 ? normalizedFaults[0] : null;
  const activeComponent =
    (primaryFault &&
      components.find(
        (c) =>
          c.referenceDesignator?.toLowerCase() ===
          primaryFault.reference_designator.toLowerCase(),
      )) ||
    (components.length > 0 ? components[0] : null);

  return {
    faults: normalizedFaults,
    primaryFault,
    activeComponent,
    observedEvidence: observedFromCase,
    inferredEvidence: inferredFromCase,
    unknownEvidence: unknownFromCase,
  };
}
