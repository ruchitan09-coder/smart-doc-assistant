"""
Data cleaning step of the training pipeline (Dataset -> Cleaning -> Labeling
-> ... in the project plan). Kept deliberately simple and dependency-free so
it's easy to extend with domain-specific rules (e.g. stripping boilerplate
headers/footers from PDFs) as you add real documents.
"""
import re


def clean_text(text: str) -> str:
    if not isinstance(text, str):
        return ""

    text = text.replace("\x00", " ")
    text = re.sub(r"\s+", " ", text)  # collapse whitespace/newlines
    text = re.sub(r"[^\x20-\x7E]", " ", text)  # drop non-printable/control chars
    return text.strip()


def clean_dataframe(df, text_column: str = "text"):
    """Cleans a text column in place and drops rows that end up empty."""
    df[text_column] = df[text_column].astype(str).map(clean_text)
    df = df[df[text_column].str.len() > 0].reset_index(drop=True)
    return df


if __name__ == "__main__":
    import argparse
    import pandas as pd

    parser = argparse.ArgumentParser(description="Clean a labeled document dataset CSV.")
    parser.add_argument("--input", default="ml/data/sample_dataset.csv")
    parser.add_argument("--output", default="ml/data/cleaned_dataset.csv")
    args = parser.parse_args()

    df = pd.read_csv(args.input)
    df = clean_dataframe(df)
    df.to_csv(args.output, index=False)
    print(f"Cleaned {len(df)} rows -> {args.output}")
