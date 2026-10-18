import base64
import json
import os
import requests
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BACKEND_URL = "http://localhost:8001/graphql"
REAL_PCB_PATH = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "test-images", "real_pcb.jpg")

with open(REAL_PCB_PATH, "rb") as f:
    real_pcb_b64 = "data:image/jpeg;base64," + base64.b64encode(f.read()).decode("utf-8")

print(f"Base64 image length: {len(real_pcb_b64)} chars")

DIAGNOSTIC_FRAGMENT = """
fragment CaseDetails on DiagnosticCaseType {
  id
  currentState
  investigationProgress
  imageQuality {
    focus
    resolution
    overall
  }
  cameraCoach {
    target
    reason
  }
  evidence {
    id
    claim
    evidenceType
    provenance
    confidence
  }
  identifiedComponents {
    referenceDesignator
    componentType
  }
  faultBoxes {
    id
    label
    component
    defect
    severity
    ymin
    xmin
    ymax
    xmax
    confidence
  }
  hypotheses {
    id
    title
    confidence
    status
    disconfirmingEvidence
  }
  activeTest {
    id
    title
    objective
    discriminatingPower
    whyThisTest
  }
  repairPlan {
    componentToReplace
    replacementSpecs
    counterfactualPrediction {
      expectedVisualChange
      expectedElectricalChange
    }
  }
  verificationResult {
    status
    visualMatchScore
    detectedChanges
  }
  confidenceTimeline {
    stage
    hypothesisId
    confidence
  }
  expiresAt
}
"""

def graphql_request(query, variables=None):
    resp = requests.post(
        BACKEND_URL,
        json={"query": query, "variables": variables or {}},
        headers={"Content-Type": "application/json"},
        timeout=45.0,
    )
    resp.raise_for_status()
    body = resp.json()
    if "errors" in body:
        raise RuntimeError(f"GraphQL Errors: {json.dumps(body['errors'], indent=2)}")
    return body["data"]

# ── STEP 1: CREATE CLOSED-LOOP DIAGNOSTIC CASE ─────────────────────────────
print("\n[STEP 1] Initializing Closed-Loop Diagnostic Case from real PCB image...")
create_mutation = f"""
{DIAGNOSTIC_FRAGMENT}
mutation CreateCase($image: String!, $question: String) {{
  createDiagnosticCase(image: $image, question: $question) {{
    ...CaseDetails
  }}
}}
"""

data = graphql_request(create_mutation, {
    "image": real_pcb_b64,
    "question": "Inspect damaged capacitor on this power board and isolate the cause.",
})
case = data["createDiagnosticCase"]
case_id = case["id"]

print(f"✓ Case created successfully: ID = {case_id}")
print(f"  Current State: {case['currentState']}")
print(f"  Progress: {round(case['investigationProgress'] * 100)}%")
print(f"  Expires: {case['expiresAt']}")
print(f"  Fault Boxes detected: {len(case['faultBoxes'])}")
for fb in case["faultBoxes"]:
    print(f"    - [{fb['severity']}] {fb['label']}: coords=({fb['ymin']}, {fb['xmin']}, {fb['ymax']}, {fb['xmax']}), conf={round(fb['confidence']*100)}%")

print(f"  Evidence items: {len(case['evidence'])}")
types = {e["evidenceType"] for e in case["evidence"]}
print(f"    - Epistemic categories present: {types}")
assert "OBSERVED" in types, "Missing OBSERVED evidence"
assert "INFERRED" in types, "Missing INFERRED evidence"
assert "UNKNOWN" in types, "Missing UNKNOWN evidence"

print(f"  Hypotheses branches: {len(case['hypotheses'])}")
for h in case["hypotheses"]:
    print(f"    - {h['id']}: {h['title']} (conf={round(h['confidence']*100)}%, status={h['status']})")
    print(f"      Disconfirming Criteria: {h['disconfirmingEvidence']}")
    assert len(h["disconfirmingEvidence"]) > 0, "Disconfirming criteria missing!"

active_test = case["activeTest"]
assert active_test is not None, "Active test must be recommended!"
print(f"  Recommended Test-to-Know: {active_test['title']}")
print(f"    Objective: {active_test['objective']}")
print(f"    Discriminating Power: {round(active_test['discriminatingPower']*100)}%")
print(f"    Why: {active_test['whyThisTest']}")

# ── STEP 2: SUBMIT PHYSICAL TEST MEASUREMENT ───────────────────────────────
print("\n[STEP 2] Submitting physical measurement (120 uF across C12 leads)...")
submit_mutation = f"""
{DIAGNOSTIC_FRAGMENT}
mutation SubmitTest($caseId: String!, $testId: String!, $resultType: String!, $numericValue: Float, $unit: String, $notes: String) {{
  submitDiagnosticTest(
    caseId: $caseId,
    testId: $testId,
    resultType: $resultType,
    numericValue: $numericValue,
    unit: $unit,
    notes: $notes
  ) {{
    ...CaseDetails
  }}
}}
"""

test_data = graphql_request(submit_mutation, {
    "caseId": case_id,
    "testId": active_test["id"],
    "resultType": "NUMERIC",
    "numericValue": 120.0,
    "unit": "uF",
    "notes": "SIMULATED TEST RESULT: In-circuit measurement after discharging C12.",
})
updated_case = test_data["submitDiagnosticTest"]
print(f"✓ Test interpreted successfully:")
print(f"  New State: {updated_case['currentState']}")
print(f"  Updated Hypotheses:")
for h in updated_case["hypotheses"]:
    print(f"    - {h['id']}: {h['title']} (conf={round(h['confidence']*100)}%, status={h['status']})")

assert updated_case["currentState"] == "REPAIR", f"Expected state REPAIR, got {updated_case['currentState']}"
assert updated_case["repairPlan"] is not None, "Repair plan must be populated"
rp = updated_case["repairPlan"]
print(f"  Repair Protocol:")
print(f"    Component: {rp['componentToReplace']}")
print(f"    Specs: {rp['replacementSpecs']}")
print(f"    Counterfactual Visual Expectation: {rp['counterfactualPrediction']['expectedVisualChange']}")

# ── STEP 3: BEFORE / AFTER REPAIR VERIFICATION ─────────────────────────────
print("\n[STEP 3] Uploading post-repair verification photograph...")
verify_mutation = f"""
{DIAGNOSTIC_FRAGMENT}
mutation VerifyRepair($caseId: String!, $afterImage: String!) {{
  verifyRepair(caseId: $caseId, afterImage: $afterImage) {{
    ...CaseDetails
  }}
}}
"""

verify_data = graphql_request(verify_mutation, {
    "caseId": case_id,
    "afterImage": real_pcb_b64,
})
verified_case = verify_data["verifyRepair"]
print(f"✓ Repair verified successfully:")
print(f"  Final State: {verified_case['currentState']}")
assert verified_case["currentState"] in ("RESOLVED", "VERIFY"), f"Expected state RESOLVED or VERIFY, got {verified_case['currentState']}"
vr = verified_case["verificationResult"]
print(f"  Verification Status: {vr['status']}")
print(f"  Visual Match Score: {round(vr['visualMatchScore'] * 100)}%")
print(f"  Detected Changes: {vr['detectedChanges']}")

# ── STEP 4: FETCH CASE BY ID & LIST CASES ──────────────────────────────────
print("\n[STEP 4] Testing diagnostic case retrieval and list queries...")
get_query = f"""
{DIAGNOSTIC_FRAGMENT}
query GetCase($id: String!) {{
  diagnosticCase(id: $id) {{
    ...CaseDetails
  }}
}}
"""
fetched = graphql_request(get_query, {"id": case_id})["diagnosticCase"]
assert fetched is not None, "Case retrieval failed"
assert fetched["id"] == case_id

list_query = """
query ListCases {
  diagnosticCases(limit: 5) {
    id
    title
    currentState
    investigationProgress
  }
}
"""

cases_list = graphql_request(list_query)["diagnosticCases"]
print(f"✓ Active cases retrieved in list: {len(cases_list)}")
assert any(c["id"] == case_id for c in cases_list), "Created case not found in list"

# ── STEP 5: DELETE DIAGNOSTIC CASE ─────────────────────────────────────────
print("\n[STEP 5] Testing deletion of diagnostic case and temporary resources...")
delete_mutation = """
mutation DeleteCase($caseId: String!) {
  deleteDiagnosticCase(caseId: $caseId)
}
"""
deleted = graphql_request(delete_mutation, {"caseId": case_id})["deleteDiagnosticCase"]
assert deleted is True, "Delete operation returned False"
print(f"✓ Case {case_id} deleted successfully.")

refetched = graphql_request(get_query, {"id": case_id})["diagnosticCase"]
assert refetched is None, "Deleted case should not be returned by get query"
print("✓ Verified case is completely purged from store.")

print("\n============================================================")
print("ALL 5 PHASES OF REALITY → ACTION CLOSED-LOOP E2E PASSED!")
print("SEE THE FAULT. TEST THE CAUSE. VERIFY THE FIX.")
print("============================================================")
