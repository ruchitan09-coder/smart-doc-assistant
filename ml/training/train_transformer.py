"""
Fine-tunes a Hugging Face transformer (DistilBERT by default) for document
classification -- the "recommended first model" from the project plan for
when you outgrow the TF-IDF baseline and have a larger labeled dataset.

Requires: pip install -r ml/requirements.txt (torch + transformers + datasets)

Usage:
    python ml/training/train_transformer.py \
        --data ml/data/sample_dataset.csv \
        --out ml/models/distilbert_classifier \
        --base-model distilbert-base-uncased \
        --epochs 4

Note: the bundled sample_dataset.csv (a few dozen rows) is only enough to
smoke-test that this script runs end-to-end -- fine-tuning a transformer
that actually generalizes needs a real labeled dataset (hundreds+ examples
per class). Swap --data for your own CSV with the same `text,label` columns.
"""
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from preprocessing.clean import clean_dataframe  # noqa: E402


def main():
    # Imported lazily so the rest of ml/ (baseline training, the FastAPI
    # service in fallback mode) doesn't hard-require torch/transformers.
    import evaluate
    import torch
    from datasets import Dataset
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder
    from transformers import (
        AutoModelForSequenceClassification,
        AutoTokenizer,
        Trainer,
        TrainingArguments,
    )

    parser = argparse.ArgumentParser(description="Fine-tune a transformer document classifier.")
    parser.add_argument("--data", default="ml/data/sample_dataset.csv")
    parser.add_argument("--out", default="ml/models/distilbert_classifier")
    parser.add_argument("--base-model", default="distilbert-base-uncased")
    parser.add_argument("--epochs", type=int, default=4)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(args.data)
    df = clean_dataframe(df, text_column="text")

    label_encoder = LabelEncoder()
    df["label_id"] = label_encoder.fit_transform(df["label"])
    num_labels = len(label_encoder.classes_)

    stratify = df["label_id"] if df["label"].value_counts().min() >= 2 else None
    train_df, test_df = train_test_split(
        df, test_size=args.test_size, random_state=args.seed, stratify=stratify
    )

    tokenizer = AutoTokenizer.from_pretrained(args.base_model)

    def tokenize(batch):
        return tokenizer(batch["text"], padding="max_length", truncation=True, max_length=256)

    train_ds = Dataset.from_pandas(train_df[["text", "label_id"]].rename(columns={"label_id": "label"}))
    test_ds = Dataset.from_pandas(test_df[["text", "label_id"]].rename(columns={"label_id": "label"}))
    train_ds = train_ds.map(tokenize, batched=True)
    test_ds = test_ds.map(tokenize, batched=True)

    model = AutoModelForSequenceClassification.from_pretrained(args.base_model, num_labels=num_labels)

    accuracy_metric = evaluate.load("accuracy")
    f1_metric = evaluate.load("f1")

    def compute_metrics(eval_pred):
        logits, labels = eval_pred
        predictions = np.argmax(logits, axis=-1)
        return {
            "accuracy": accuracy_metric.compute(predictions=predictions, references=labels)["accuracy"],
            "f1_macro": f1_metric.compute(predictions=predictions, references=labels, average="macro")["f1"],
        }

    training_args = TrainingArguments(
        output_dir=str(out_dir / "checkpoints"),
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1_macro",
        logging_steps=10,
        report_to=[],
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=test_ds,
        compute_metrics=compute_metrics,
    )

    trainer.train()
    eval_metrics = trainer.evaluate()

    final_dir = out_dir / "final"
    model.save_pretrained(final_dir)
    tokenizer.save_pretrained(final_dir)

    (out_dir / "label_map.json").write_text(
        json.dumps({str(i): c for i, c in enumerate(label_encoder.classes_)}, indent=2)
    )
    (out_dir / "metrics.json").write_text(json.dumps(eval_metrics, indent=2, default=float))
    (out_dir / "version.json").write_text(
        json.dumps(
            {
                "model_version": "distilbert-doc-classifier-v1",
                "model_type": "transformer",
                "base_model": args.base_model,
                "trained_at": datetime.now(timezone.utc).isoformat(),
                "training_examples": len(train_df),
                "classes": label_encoder.classes_.tolist(),
            },
            indent=2,
        )
    )

    print(f"Eval metrics: {eval_metrics}")
    print(f"Saved fine-tuned model to {final_dir}/")


if __name__ == "__main__":
    main()
