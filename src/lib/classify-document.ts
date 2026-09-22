import { prisma } from "@/lib/prisma";
import { classifyDocumentText } from "@/lib/classifier";

export async function classifyAndStoreDocument(documentId: string) {
  const chunks = await prisma.documentChunk.findMany({
    where: { documentId },
    orderBy: { chunkIndex: "asc" },
    take: 12, // enough content for a reliable prediction without over-fetching
    select: { content: true },
  });

  const text = chunks.map((c) => c.content).join("\n\n");
  if (!text.trim()) {
    throw new Error("Document has no extracted text to classify yet");
  }

  const result = await classifyDocumentText(text);

  const prediction = await prisma.modelPrediction.create({
    data: {
      documentId,
      modelVersion: result.modelVersion,
      modelSource: result.modelSource,
      predictedClass: result.label,
      confidence: result.confidence,
      scores: result.scores,
    },
  });

  return prediction;
}
