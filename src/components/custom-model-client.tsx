"use client";
import { useState } from "react";
import Link from "next/link";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { useToast } from "./ui/toast";
import { fileTypeIcon } from "@/lib/ui-helpers";
import { CLASS_LABELS } from "@/lib/classifier/labels";
import type { DocumentClass } from "@/lib/classifier/labels";

interface DocOption {
  id: string;
  fileName: string;
}

interface Prediction {
  id: string;
  documentId: string;
  fileName: string;
  fileType: string;
  predictedClass: string;
  confidence: number;
  scores: Record<string, number>;
  modelVersion: string;
  modelSource: string;
  createdAt: string;
}

function classLabel(value: string): string {
  return CLASS_LABELS[value as DocumentClass] ?? value;
}

export function CustomModelClient({
  documents,
  initialPredictions,
}: {
  documents: DocOption[];
  initialPredictions: Prediction[];
}) {
  const [selectedId, setSelectedId] = useState(documents[0]?.id ?? "");
  const [predictions, setPredictions] = useState(initialPredictions);
  const [classifying, setClassifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  async function handleClassify() {
    if (!selectedId) return;
    setClassifying(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${selectedId}/classify`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Classification failed");
        showToast(data.error ?? "Classification failed", "error");
        return;
      }
      const doc = documents.find((d) => d.id === selectedId);
      setPredictions((prev) => [
        {
          id: data.prediction.id,
          documentId: selectedId,
          fileName: doc?.fileName ?? "Document",
          fileType: "",
          predictedClass: data.prediction.predictedClass,
          confidence: data.prediction.confidence,
          scores: data.prediction.scores,
          modelVersion: data.prediction.modelVersion,
          modelSource: data.prediction.modelSource,
          createdAt: data.prediction.createdAt,
        },
        ...prev,
      ]);
      showToast(`Classified as ${classLabel(data.prediction.predictedClass)}`, "success");
    } catch {
      setError("Network error — please try again.");
      showToast("Network error — please try again.", "error");
    } finally {
      setClassifying(false);
    }
  }

  const latest = predictions[0];
  const topScores = latest
    ? Object.entries(latest.scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="font-semibold mb-3">Classify a document</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-gray-500">
            No documents are ready to classify yet — upload and process a document first.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm min-w-[220px]"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fileName}
                </option>
              ))}
            </select>
            <Button onClick={handleClassify} disabled={classifying}>
              {classifying ? "Classifying..." : "Run classification"}
            </Button>
          </div>
        )}
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        {latest && (
          <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-500">Latest prediction</p>
            <p className="text-xl font-bold text-brand-500 mt-1">{classLabel(latest.predictedClass)}</p>
            <p className="text-xs text-gray-500 mt-1">
              Confidence {(latest.confidence * 100).toFixed(1)}% · {latest.modelVersion} ({latest.modelSource})
            </p>
            <div className="mt-3 space-y-1.5">
              {topScores.map(([cls, score]) => (
                <div key={cls} className="flex items-center gap-2 text-xs">
                  <span className="w-36 shrink-0 text-gray-500">{classLabel(cls)}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className="h-full bg-brand-500"
                      style={{ width: `${Math.max(2, score * 100)}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-gray-500">{(score * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div>
        <h2 className="font-semibold mb-3">Prediction history</h2>
        {predictions.length === 0 ? (
          <p className="text-sm text-gray-500">No predictions yet.</p>
        ) : (
          <div className="space-y-2">
            {predictions.map((p) => (
              <Card key={p.id} className="p-4 flex items-center justify-between gap-3">
                <Link
                  href={`/documents/${p.documentId}`}
                  className="flex items-center gap-3 min-w-0 hover:text-brand-500"
                >
                  <span className="text-lg shrink-0">{fileTypeIcon(p.fileType)}</span>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.fileName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(p.createdAt).toLocaleString()} · {p.modelVersion}
                    </p>
                  </div>
                </Link>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{classLabel(p.predictedClass)}</p>
                  <p className="text-xs text-gray-500">{(p.confidence * 100).toFixed(1)}% confidence</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
