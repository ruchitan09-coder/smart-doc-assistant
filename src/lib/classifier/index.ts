import { classifyLocal } from "./local-model";
import { classifyRemote } from "./remote";

export interface DocumentClassification {
  label: string;
  confidence: number;
  scores: Record<string, number>;
  modelVersion: string;
  modelSource: "local" | "remote";
}

// Truncate to keep both the local TF-IDF vectorizer and the remote model's
// request payload small -- classification only needs a representative
// sample of the document, not the full text.
const MAX_CHARS = 4000;

export async function classifyDocumentText(text: string): Promise<DocumentClassification> {
  const sample = text.slice(0, MAX_CHARS);

  const remote = await classifyRemote(sample);
  if (remote) {
    return {
      label: remote.label,
      confidence: remote.confidence,
      scores: remote.scores,
      modelVersion: remote.modelVersion,
      modelSource: "remote",
    };
  }

  const local = await classifyLocal(sample);
  return {
    label: local.label,
    confidence: local.confidence,
    scores: local.scores,
    modelVersion: local.modelVersion,
    modelSource: "local",
  };
}

export { DOCUMENT_CLASSES, CLASS_LABELS } from "./labels";
export { LOCAL_MODEL_VERSION } from "./local-model";
