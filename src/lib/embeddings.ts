// Generates embeddings locally using transformers.js (runs the
// all-MiniLM-L6-v2 model in-process, in plain Node.js) -- no external API,
// no cost, no rate limit. Produces 384-dimension vectors, matching the
// `vector(384)` column in prisma/schema.prisma.
//
// IMPORTANT: this must only be imported in Node.js runtime route handlers
// (not Edge runtime, and not client components) -- see the
// `export const runtime = "nodejs"` line in each API route that uses it.

import { pipeline, type FeatureExtractionPipeline } from "@xenova/transformers";

let embedderPromise: Promise<FeatureExtractionPipeline> | null = null;

function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    ) as Promise<FeatureExtractionPipeline>;
  }
  return embedderPromise;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embedder = await getEmbedder();
  const results: number[][] = [];

  for (const text of texts) {
    const output = await embedder(text, { pooling: "mean", normalize: true });
    results.push(Array.from(output.data as Float32Array));
  }

  return results;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  return vector;
}
