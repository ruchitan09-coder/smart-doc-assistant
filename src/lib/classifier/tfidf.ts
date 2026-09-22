// Minimal TF-IDF + multinomial logistic regression, implemented from scratch
// in plain TypeScript (no numpy/sklearn equivalent needed). This mirrors
// exactly what ml/training/train_tfidf_baseline.py does with scikit-learn --
// same features, same model family -- just re-implemented so it can train
// and run in-process inside a Node.js API route with zero extra
// infrastructure. See ml/README.md if you outgrow this and want the real
// Python-trained pipeline instead.

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "to", "in", "on", "for", "with",
  "is", "are", "was", "were", "be", "been", "being", "this", "that", "these",
  "those", "it", "its", "as", "at", "by", "from", "into", "your", "you",
  "we", "our", "their", "they", "he", "she", "his", "her", "i", "will",
  "shall", "may", "can", "not", "no", "do", "does", "did", "have", "has",
  "had", "if", "so", "than", "then", "there", "here", "up", "out", "about",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export interface TfidfVectorizer {
  vocabulary: string[];
  idf: number[];
}

export function buildVectorizer(documents: string[], maxFeatures = 2000): TfidfVectorizer {
  const docFreq = new Map<string, number>();
  const tokenizedDocs = documents.map(tokenize);

  for (const tokens of tokenizedDocs) {
    for (const term of new Set(tokens)) {
      docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
    }
  }

  const n = documents.length;
  const ranked = [...docFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxFeatures);
  const vocabulary = ranked.map(([term]) => term);
  const idf = ranked.map(([, df]) => Math.log((1 + n) / (1 + df)) + 1);

  return { vocabulary, idf };
}

export function vectorize(text: string, vec: TfidfVectorizer): number[] {
  const tokens = tokenize(text);
  const termCounts = new Map<string, number>();
  for (const t of tokens) termCounts.set(t, (termCounts.get(t) ?? 0) + 1);

  const vector = new Array(vec.vocabulary.length).fill(0);
  const totalTerms = tokens.length || 1;

  vec.vocabulary.forEach((term, i) => {
    const tf = (termCounts.get(term) ?? 0) / totalTerms;
    vector[i] = tf * vec.idf[i];
  });

  // L2 normalize (standard for TF-IDF + linear classifiers).
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

export interface LogisticRegressionModel {
  classes: string[];
  weights: number[][]; // [numClasses][numFeatures]
  bias: number[]; // [numClasses]
}

function softmax(scores: number[]): number[] {
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

// Trains a multinomial (softmax) logistic regression classifier with plain
// batch gradient descent + L2 regularization. Small dataset + small feature
// count (see buildVectorizer maxFeatures), so this converges in well under a
// second even on a modest server.
export function trainLogisticRegression(
  features: number[][],
  labels: string[],
  classes: string[],
  { epochs = 300, learningRate = 0.5, l2 = 0.001 } = {}
): LogisticRegressionModel {
  const numFeatures = features[0]?.length ?? 0;
  const numClasses = classes.length;
  const classIndex = new Map(classes.map((c, i) => [c, i]));

  const weights: number[][] = Array.from({ length: numClasses }, () => new Array(numFeatures).fill(0));
  const bias: number[] = new Array(numClasses).fill(0);

  const oneHot = labels.map((label) => {
    const row = new Array(numClasses).fill(0);
    const idx = classIndex.get(label);
    if (idx !== undefined) row[idx] = 1;
    return row;
  });

  const n = features.length;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradW: number[][] = Array.from({ length: numClasses }, () => new Array(numFeatures).fill(0));
    const gradB: number[] = new Array(numClasses).fill(0);

    for (let i = 0; i < n; i++) {
      const x = features[i];
      const scores = weights.map((w, c) => w.reduce((sum, wj, j) => sum + wj * x[j], bias[c]));
      const probs = softmax(scores);

      for (let c = 0; c < numClasses; c++) {
        const error = probs[c] - oneHot[i][c];
        for (let j = 0; j < numFeatures; j++) {
          gradW[c][j] += error * x[j];
        }
        gradB[c] += error;
      }
    }

    for (let c = 0; c < numClasses; c++) {
      for (let j = 0; j < numFeatures; j++) {
        weights[c][j] -= learningRate * (gradW[c][j] / n + l2 * weights[c][j]);
      }
      bias[c] -= learningRate * (gradB[c] / n);
    }
  }

  return { classes, weights, bias };
}

export function predict(model: LogisticRegressionModel, x: number[]): { label: string; scores: Record<string, number> } {
  const scores = model.weights.map((w, c) => w.reduce((sum, wj, j) => sum + wj * x[j], model.bias[c]));
  const probs = softmax(scores);
  const scoreMap: Record<string, number> = {};
  model.classes.forEach((cls, i) => (scoreMap[cls] = probs[i]));

  const bestIndex = probs.indexOf(Math.max(...probs));
  return { label: model.classes[bestIndex], scores: scoreMap };
}
