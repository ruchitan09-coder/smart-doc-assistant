// Client for the real trained model: the FastAPI service in ml/service,
// running the DistilBERT (or TF-IDF baseline) model trained by
// ml/training/*.py. Only used when MODEL_API_URL is set -- otherwise the app
// falls back to the local in-process classifier (src/lib/classifier/local-model.ts).

export interface RemoteClassificationResult {
  label: string;
  confidence: number;
  scores: Record<string, number>;
  modelVersion: string;
}

export async function classifyRemote(text: string): Promise<RemoteClassificationResult | null> {
  const baseUrl = process.env.MODEL_API_URL;
  if (!baseUrl) return null;

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      // Keep this bounded -- if the inference service is slow/down, we want
      // to fall back to the local classifier rather than hang the request.
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const data = await res.json();

    if (!data?.label || typeof data.confidence !== "number") return null;

    return {
      label: data.label,
      confidence: data.confidence,
      scores: data.scores ?? {},
      modelVersion: data.model_version ?? "remote-model",
    };
  } catch {
    // Network error, timeout, or service not deployed yet -- caller falls
    // back to the local classifier.
    return null;
  }
}
