import base64
import os
import requests
import json

REAL_PCB_PATH = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "test-images", "real_pcb.jpg")
with open(REAL_PCB_PATH, "rb") as f:
    real_pcb_b64 = "data:image/jpeg;base64," + base64.b64encode(f.read()).decode("utf-8")

query = """
fragment DiagnosticCaseFields on DiagnosticCaseType {
  id
  userId
  sessionId
  title
  domain
  status
  currentState
  investigationProgress
  initialImageUrl
  latestImageUrl
  afterImageUrl
  imageQuality {
    focus
    resolution
    glare
    lighting
    occlusion
    overall
    guidance
  }
  cameraCoach {
    target
    reason
    whereToPoint
    howClose
    whatAngle
    lightingRequirement
    whatMustBeVisible
  }
  evidence {
    id
    claim
    evidenceType
    provenance
    confidence
    sourceReference
  }
  identifiedComponents {
    id
    referenceDesignator
    componentType
    package
    marking
    orientation
    identityConfidence
    locationConfidence
    defectConfidence
  }
  faultBoxes {
    id
    label
    component
    defect
    ymin
    xmin
    ymax
    xmax
    confidence
    severity
    locationType
    observedEvidence
    inferredInterpretation
    unknowns
    recommendedInspection
  }
  hypotheses {
    id
    title
    confidence
    status
    riskLevel
    observedEvidence
    supportingEvidence
    disconfirmingEvidence
    recommendedTest
    affectedComponents
  }
  activeTest {
    id
    title
    objective
    hypothesisIds
    requiredTools
    prerequisites
    safetyWarnings
    procedure
    expectedOutcomes {
      condition
      interpretation
    }
    discriminatingPower
    whyThisTest
  }
  repairPlan {
    faultId
    componentToReplace
    replacementSpecs
    requiredTools
    prerequisites
    safetyWarnings
    procedureSteps
    counterfactualPrediction {
      expectedVisualChange
      expectedElectricalChange
      unacceptableOutcomes
    }
    verificationMethod
  }
  verificationResult {
    status
    visualMatchScore
    detectedChanges
    missingExpectedChanges
    summary
    electricalVerificationRequired
  }
  confidenceTimeline {
    timestamp
    stage
    hypothesisId
    confidence
    triggerEvent
  }
  events {
    id
    timestamp
    eventType
    description
  }
  createdAt
  updatedAt
  expiresAt
  resolvedAt
}

mutation CreateDiagnosticCase($image: String!, $question: String, $sessionId: String) {
  createDiagnosticCase(image: $image, question: $question, sessionId: $sessionId) {
    ...DiagnosticCaseFields
  }
}
"""

r = requests.post(
    "http://localhost:8001/graphql",
    json={"query": query, "variables": {"image": real_pcb_b64, "question": "Diagnose damaged capacitor", "sessionId": "session-real-test-1"}},
    timeout=60,
)
print("STATUS:", r.status_code)
body = r.json()
print("ERRORS:", body.get("errors"))
if body.get("data") and body["data"].get("createDiagnosticCase"):
    case = body["data"]["createDiagnosticCase"]
    print("SUCCESSFULLY CREATED CASE!")
    print("ID:", case["id"])
    print("TITLE:", case["title"])
    print("STATE:", case["currentState"])
    print("FAULT BOXES:", len(case["faultBoxes"]))
    print("HYPOTHESES:", len(case["hypotheses"]))
    print("ACTIVE TEST:", case["activeTest"]["title"] if case["activeTest"] else "None")
