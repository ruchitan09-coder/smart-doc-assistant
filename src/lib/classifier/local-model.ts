import { TRAINING_EXAMPLES } from "./train-data";
import { DOCUMENT_CLASSES } from "./labels";
import {
  buildVectorizer,
  vectorize,
  trainLogisticRegression,
  predict,
  type TfidfVectorizer,
  type LogisticRegressionModel,
} from "./tfidf";

export const LOCAL_MODEL_VERSION = "tfidf-logreg-v1";

interface TrainedModel {
  vectorizer: TfidfVectorizer;
  model: LogisticRegressionModel;
}

// Trained once per server process and cached, the same way src/lib/embeddings.ts
// caches its transformers.js pipeline -- avoids retraining on every request.
let trainedPromise: Promise<TrainedModel> | null = null;

function train(): TrainedModel {
  const vectorizer = buildVectorizer(TRAINING_EXAMPLES.map((e) => e.text));
  const features = TRAINING_EXAMPLES.map((e) => vectorize(e.text, vectorizer));
  const labels = TRAINING_EXAMPLES.map((e) => e.label);
  const model = trainLogisticRegression(features, labels, [...DOCUMENT_CLASSES]);
  return { vectorizer, model };
}

function getTrainedModel(): Promise<TrainedModel> {
  if (!trainedPromise) {
    trainedPromise = Promise.resolve().then(train);
  }
  return trainedPromise;
}

export interface ClassificationResult {
  label: string;
  confidence: number;
  scores: Record<string, number>;
  modelVersion: string;
}

export async function classifyLocal(text: string): Promise<ClassificationResult> {
  const { vectorizer, model } = await getTrainedModel();
  const vector = vectorize(text, vectorizer);
  const { label, scores } = predict(model, vector);

  return {
    label,
    confidence: scores[label] ?? 0,
    scores,
    modelVersion: LOCAL_MODEL_VERSION,
  };
}
