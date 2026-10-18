# AI-Generated Image Authenticity Detection — Evaluation Framework

## Overview

This directory defines the evaluation methodology, dataset structure, and performance metrics for the in-browser AI-generated image authenticity detection layer powered by **Detectra v3** (`TensorFold/detectra-v1`).

The detector outputs a probability $p \in [0, 1]$ indicating the likelihood that an image is synthetic or AI-generated. The product classification uses configurable thresholds:

- **$p \ge 0.75$**: `LIKELY_AI_GENERATED`
- **$p \le 0.25$**: `LIKELY_REAL`
- **$0.25 < p < 0.75$**: `UNCERTAIN`
- Model/Runtime failure: `UNAVAILABLE`

---

## Dataset Format

Evaluation datasets should be placed in `evaluation/authenticity/datasets/` as CSV or JSONL files with the following schema:

```csv
image_path,ground_truth
datasets/real/camera_photo_001.jpg,REAL
datasets/real/circuit_board_photo.png,REAL
datasets/ai/midjourney_v6_pcb.png,AI
datasets/ai/flux_capacitor.webp,AI
```

Where:
- `image_path`: Relative or absolute path to the image file.
- `ground_truth`: Either `REAL` or `AI`.

---

## Evaluation Status

> [!IMPORTANT]
> **Evaluation dataset not yet provided.**
> Benchmark metrics have not been computed on an internal proprietary dataset for this deployment.
> Do not claim Detectra's published model-card benchmark metrics as our application's operational accuracy. Real-world accuracy depends on image compression, sensor noise, platform downsampling, and novel generator architectures.

---

## Evaluation Metrics (To Be Calculated)

When a labeled evaluation dataset is supplied, the evaluation script computes the following metrics across decision thresholds:

1. **Accuracy**:
   $$\text{Accuracy} = \frac{TP + TN}{TP + TN + FP + FN}$$
2. **Precision**:
   $$\text{Precision} = \frac{TP}{TP + FP}$$
3. **Recall (True Positive Rate)**:
   $$\text{Recall} = \frac{TP}{TP + FN}$$
4. **F1-Score**:
   $$\text{F1} = 2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$$
5. **False Positive Rate (FPR)**:
   $$\text{FPR} = \frac{FP}{FP + TN}$$
   *(Critical for preventing false accusations against authentic real-world technical photographs).*
6. **False Negative Rate (FNR)**:
   $$\text{FNR} = \frac{FN}{TP + FN}$$
7. **Confusion Matrix**:
   - True Real (TN)
   - False AI (FP)
   - True AI (TP)
   - False Real (FN)
   - Uncertain (Excluded from binary hard-metrics or treated as separate triage bin)
8. **ROC-AUC**:
   Area Under the Receiver Operating Characteristic curve across varying probability thresholds from 0.0 to 1.0.

---

## Running Evaluation

When images and annotations are populated in `datasets/`, execute the evaluation script:

```bash
python evaluate.py --dataset datasets/validation_set.csv --model ../../models/detectra.onnx
```

---

## Known Limitations

AI-image detection is probabilistic and can be affected by:
- JPEG/WebP recompression and social media compression artifacts.
- Resizing, cropping, and screenshotting.
- Editing, color grading, and camera ISP (Image Signal Processor) computational photography pipelines.
- Unseen generator architectures (e.g. newer diffusion, autoregressive, or flow matching models not present during training).
