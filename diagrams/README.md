# System Architecture Diagrams (`diagrams/`)

The `diagrams` directory holds architectural visual diagrams, vector flowcharts, and Draw.io project files illustrating system components and data sequence flows.

---

## 🎨 Diagram Files

- **`overviews.drawio`**: Draw.io diagram source file containing complete system component overview, microservice interactions, S3 object storage data flow, and background worker queue pipeline.
- **`training_worker_architecture.drawio`**: Draw.io diagram for scheduled Token Classification trainer worker pipeline showing Client Request (`Add train queue time`), FastAPI Gateway, Redis Queue (`arq:queue`), Hugging Face Dataset ingestion, MinIO Object Storage (`datasets` and `models` buckets), and Trainer Worker asynchronous execution flow.

---

## 🛠️ View & Edit Instructions

1. Open [Draw.io (app.diagrams.net)](https://app.diagrams.net/).
2. Select **Open Existing Diagram** and upload `overviews.drawio`.
3. Export updated diagrams as PNG or SVG into `assets/` or `agent_folder/screenshots/` as needed.
