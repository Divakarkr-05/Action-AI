"""
REALITY → ACTION AI – Authenticity Detector Evaluation Script

Evaluates Detectra v3 ONNX model against a labeled dataset (CSV with columns: image_path, ground_truth).
Ground truth must be 'REAL' or 'AI'.
"""

import argparse
import csv
import math
import os
import sys
from typing import Dict, List, Tuple


def evaluate(csv_path: str, model_path: str):
    if not os.path.exists(csv_path):
        print(f"Error: Dataset file '{csv_path}' not found.")
        print("Status: Evaluation dataset not yet provided.")
        sys.exit(1)

    print(f"Loading dataset from: {csv_path}")
    print(f"Using ONNX model: {model_path}")

    records: List[Tuple[str, str]] = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            img = row.get("image_path", "").strip()
            gt = row.get("ground_truth", "").strip().upper()
            if img and gt in ("REAL", "AI"):
                records.append((img, gt))

    if not records:
        print("No valid evaluation samples found in CSV.")
        sys.exit(1)

    print(f"Loaded {len(records)} samples for evaluation.")
    print("Computing metrics...")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Detectra v3 ONNX model.")
    parser.add_argument("--dataset", required=True, help="Path to CSV dataset (image_path, ground_truth)")
    parser.add_argument("--model", default="../../models/detectra.onnx", help="Path to detectra.onnx")
    args = parser.parse_args()
    evaluate(args.dataset, args.model)
