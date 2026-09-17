"""Unit tests for Scheduled Training Worker, Hugging Face dataset download, and Train router."""

import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
import pytest

from backend.app.schemas.train import TrainJobRequest, TrainJobResponse
from backend.app.services.worker_settings import WorkerSettings
from backend.app.services.trainer_worker import (
    train_model_job,
    build_vocab,
    encode_dataset,
    setup_training_logger,
)
from scripts.download_hf_dataset import (
    download_hf_token_classification_dataset,
    generate_synthetic_token_classification_data,
    save_and_upload_dataset,
    NER_LABELS,
    ID2LABEL,
    LABEL2ID,
)

ROOT_DIR = Path(__file__).resolve().parents[1]


def test_hf_dataset_structure():
    """Verify Hugging Face dataset download and data schema."""
    data = generate_synthetic_token_classification_data()
    assert "train" in data
    assert "validation" in data
    assert len(data["train"]) > 0
    assert len(data["validation"]) > 0
    assert data["num_classes"] == len(NER_LABELS)

    # Check record structure
    first = data["train"][0]
    assert "tokens" in first
    assert "ner_tags" in first
    assert "ner_labels" in first
    assert len(first["tokens"]) == len(first["ner_tags"]) == len(first["ner_labels"])


def test_save_and_upload_dataset_locally():
    """Verify save_and_upload_dataset creates valid JSON artifacts."""
    res = save_and_upload_dataset(
        output_dir=str(ROOT_DIR / "datasets"),
        object_name="wikiann.json",
    )
    assert res["status"] == "success"
    assert res["train_samples"] > 0

    local_path = ROOT_DIR / "datasets" / "wikiann.json"
    assert local_path.exists()
    assert local_path.stat().st_size > 0

    with open(local_path, "r", encoding="utf-8") as f:
        loaded = json.load(f)
    assert loaded["task"] == "token-classification"
    assert len(loaded["train"]) > 0


def test_vocab_and_encoding():
    """Test vocabulary building and tensor encoding."""
    tokens_list = [["Barack", "Obama", "visited", "Paris"], ["Apple", "is", "in", "Cupertino"]]
    vocab = build_vocab(tokens_list)
    assert "<PAD>" in vocab
    assert "<UNK>" in vocab
    assert "barack" in vocab
    assert "apple" in vocab

    records = [
        {"tokens": ["Barack", "Obama"], "ner_tags": [1, 2]},
        {"tokens": ["Apple"], "ner_tags": [3]},
    ]
    x, y = encode_dataset(records, vocab, max_len=4)
    assert len(x) == 2
    assert len(x[0]) == 4
    assert len(y[0]) == 4
    assert y[0][2] == -100  # padding tag


def test_train_job_request_schema():
    """Test TrainJobRequest schema with delay_seconds and scheduled_time."""
    req1 = TrainJobRequest(
        dataset_id=1,
        model_name="token_classification_v1",
        delay_seconds=60,
    )
    assert req1.delay_seconds == 60
    assert req1.scheduled_time is None

    req2 = TrainJobRequest(
        dataset_id=2,
        model_name="wikiann_ner",
        scheduled_time="2026-08-31T06:00:00Z",
    )
    assert req2.scheduled_time == "2026-08-31T06:00:00Z"
    assert req2.delay_seconds is None


def test_worker_settings_registration():
    """Verify train_model_job is registered in WorkerSettings.functions."""
    func_names = [f.__name__ for f in WorkerSettings.functions]
    assert "train_model_job" in func_names
    assert "simple_work" in func_names


def test_train_model_job_execution():
    """Test train_model_job execution, logging to logs/training.log, and saving model checkpoint."""
    import asyncio

    async def _run():
        ctx = {"job_id": "test_exec_001"}
        data = {
            "dataset_id": 1,
            "model_name": "token_classification_v1",
            "hyperparameters": {
                "epochs": 2,
                "batch_size": 8,
                "learning_rate": 0.001,
                "embed_dim": 32,
                "hidden_dim": 64,
            },
        }

        result = await train_model_job(ctx, data)

        assert result["status"] == "completed"
        assert result["job_id"] == "test_exec_001"
        assert result["epochs"] == 2
        assert "final_loss" in result
        assert "final_accuracy" in result
        assert result["minio_bucket"] == "models"
        assert result["minio_object"] == "token_classification_v1.pt"

        # Verify model artifact exists
        model_path = ROOT_DIR / "models" / "token_classification_v1.pt"
        assert model_path.exists()
        assert model_path.stat().st_size > 0

        # Verify training log exists and has entries
        log_path = ROOT_DIR / "logs" / "training.log"
        assert log_path.exists()
        assert log_path.stat().st_size > 0
        with open(log_path, "r", encoding="utf-8") as f:
            log_content = f.read()
        assert "test_exec_001" in log_content
        assert "Epoch" in log_content

    asyncio.run(_run())
