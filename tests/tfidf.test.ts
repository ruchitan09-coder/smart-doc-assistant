import { describe, it, expect } from "vitest";
import { buildVectorizer, vectorize, trainLogisticRegression, predict } from "../src/lib/classifier/tfidf";

describe("buildVectorizer", () => {
  it("builds a vocabulary ranked by document frequency", () => {
    const docs = ["invoice payment due", "invoice total amount", "contract terms"];
    const vec = buildVectorizer(docs);
    expect(vec.vocabulary).toContain("invoice");
    expect(vec.vocabulary.length).toBe(vec.idf.length);
  });

  it("excludes stopwords and single-character tokens from the vocabulary", () => {
    const vec = buildVectorizer(["the a of to in on for with is are"]);
    expect(vec.vocabulary).toEqual([]);
  });

  it("caps the vocabulary at maxFeatures", () => {
    const docs = Array.from({ length: 20 }, (_, i) => `uniqueterm${i} common`);
    const vec = buildVectorizer(docs, 5);
    expect(vec.vocabulary.length).toBeLessThanOrEqual(5);
  });
});

describe("vectorize", () => {
  it("produces an L2-normalized vector matching the vocabulary length", () => {
    const vec = buildVectorizer(["invoice payment due", "invoice total amount"]);
    const v = vectorize("invoice payment", vec);
    expect(v.length).toBe(vec.vocabulary.length);

    const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
    // Zero vector (e.g. no vocabulary overlap) stays 0; anything with
    // overlap should normalize to ~1.
    if (v.some((x) => x !== 0)) {
      expect(norm).toBeCloseTo(1, 5);
    }
  });

  it("returns an all-zero vector for text with no vocabulary overlap", () => {
    const vec = buildVectorizer(["invoice payment due"]);
    const v = vectorize("zzz yyy xxx", vec);
    expect(v.every((x) => x === 0)).toBe(true);
  });
});

describe("trainLogisticRegression + predict", () => {
  it("learns to separate two clearly distinct classes", () => {
    const docs = [
      "invoice payment due total amount owed",
      "invoice billing statement balance due",
      "contract terms conditions agreement parties",
      "contract legal binding agreement clause",
    ];
    const labels = ["invoice", "invoice", "contract", "contract"];
    const classes = ["invoice", "contract"];

    const vectorizer = buildVectorizer(docs);
    const features = docs.map((d) => vectorize(d, vectorizer));
    const model = trainLogisticRegression(features, labels, classes, { epochs: 200 });

    const testVector = vectorize("invoice payment total amount", vectorizer);
    const result = predict(model, testVector);

    expect(result.label).toBe("invoice");
    expect(Object.keys(result.scores).sort()).toEqual([...classes].sort());

    const scoreSum = Object.values(result.scores).reduce((a, b) => a + b, 0);
    expect(scoreSum).toBeCloseTo(1, 5); // softmax outputs a probability distribution
  });
});
