"""
Test Visual Fault Map E2E Live Integration
Sends an inspection request with real_pcb.jpg to the backend GraphQL endpoint
and asserts that visualFaults are properly populated with normalized coordinates.
"""

import base64
import json
import os
import urllib.request

GRAPHQL_URL = "http://localhost:8001/graphql"
IMAGE_PATH = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "test-images", "real_pcb.jpg")

def run_test():
    assert os.path.exists(IMAGE_PATH), f"Fixture image not found at {IMAGE_PATH}"
    with open(IMAGE_PATH, "rb") as f:
        img_bytes = f.read()
    b64_str = f"data:image/jpeg;base64,{base64.b64encode(img_bytes).decode('utf-8')}"

    query = """
    mutation AnalyzeReality($image: String!, $question: String) {
      analyzeReality(image: $image, question: $question) {
        whatISee
        whatIsHappening
        nextAction
        steps
        confidence
        visualFaults {
          id
          componentLabel
          description
          severity
          ymin
          xmin
          ymax
          xmax
        }
        groundingSources
        imageAuthenticity
      }
    }
    """

    payload = {
        "query": query,
        "variables": {
            "image": b64_str,
            "question": "Inspect the PCB for visual faults and locate bulging capacitors or damage.",
        }
    }

    req = urllib.request.Request(
        GRAPHQL_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )

    print(f"Connecting to live backend at {GRAPHQL_URL}...")
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read().decode("utf-8"))

    print("Response received:")
    print(json.dumps(result, indent=2))

    data = result.get("data", {}).get("analyzeReality", {})
    assert data, "Expected analyzeReality data in response"
    assert "visualFaults" in data, "visualFaults field missing in analyzeReality response"

    faults = data["visualFaults"]
    print(f"\nVisual Faults Found: {len(faults)}")
    assert len(faults) > 0, "Expected at least 1 visual fault detected"

    for idx, fault in enumerate(faults):
        print(f"\n--- Fault {idx + 1} ---")
        print(f"ID: {fault['id']}")
        print(f"Component: {fault['componentLabel']}")
        print(f"Severity: {fault['severity']}")
        print(f"Description: {fault['description']}")
        print(f"Box: ymin={fault['ymin']}, xmin={fault['xmin']}, ymax={fault['ymax']}, xmax={fault['xmax']}")

        # Validate coordinate constraints
        assert 0.0 <= fault['ymin'] <= 1.0, f"ymin out of range: {fault['ymin']}"
        assert 0.0 <= fault['xmin'] <= 1.0, f"xmin out of range: {fault['xmin']}"
        assert 0.0 <= fault['ymax'] <= 1.0, f"ymax out of range: {fault['ymax']}"
        assert 0.0 <= fault['xmax'] <= 1.0, f"xmax out of range: {fault['xmax']}"
        assert fault['ymin'] <= fault['ymax'], f"ymin {fault['ymin']} > ymax {fault['ymax']}"
        assert fault['xmin'] <= fault['xmax'], f"xmin {fault['xmin']} > xmax {fault['xmax']}"
        assert fault['severity'] in ("CRITICAL", "WARNING", "INFO"), f"Unknown severity: {fault['severity']}"

    print("\n[OK] ALL VISUAL FAULT MAP E2E CHECKS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_test()
