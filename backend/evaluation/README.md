# Evaluation Metrics & Synthetic Sample Pairs

This directory contains evaluation benchmarks for the FoundIt AI multi-modal matching engine.

## Note on Synthetic Data
The `sample_pairs.json` file contains **synthetic, ground-truth labeled lost and found evaluation pairs** designed to benchmark Precision@K, Recall@K, Mean Average Precision (mAP), and end-to-end match latency across CLIP visual vectors, BGE text embeddings, and metadata context scoring.

## Running Evaluation Metrics

To execute the metrics evaluation script and print the terminal benchmark report:

```bash
cd backend
python evaluation/run_metrics.py
```

## Outputs
- **Console Output**: Prints a clean, formatted ASCII terminal table displaying:
  - `Precision@1`, `Precision@3`
  - `Recall@1`, `Recall@3`
  - `Mean Average Precision (mAP)`
  - `Average End-to-End Latency (ms)`
- **JSON Output**: Generates `backend/evaluation/results.json` containing complete evaluation metadata.
