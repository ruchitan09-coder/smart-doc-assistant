import { createAdminClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { extractText } from "@/lib/extract";
import { chunkText } from "@/lib/chunk";
import { embedTexts } from "@/lib/embeddings";
import { saveChunkEmbedding } from "@/lib/vector";
import { classifyAndStoreDocument } from "@/lib/classify-document";

/**
 * The full extract -> chunk -> embed -> classify pipeline for one document.
 * Extracted from the old /api/documents/:id/process route so it can be
 * called both from that route (manual/immediate trigger) and from the
 * background job worker (src/app/api/jobs/run/route.ts), which is what
 * actually retries a document if the immediate attempt fails or the
 * process crashes mid-run.
 *
 * Throws on failure -- callers are responsible for recording the failure
 * (on the Document row, the ProcessingJob row, or both).
 */
export async function processDocument(documentId: string): Promise<{ chunks: number }> {
  const document = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });

  await prisma.document.update({
    where: { id: document.id },
    data: { processingStatus: "PROCESSING", errorMessage: null },
  });

  const admin = createAdminClient();
  const { data: fileData, error: downloadError } = await admin.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET ?? "documents")
    .download(document.storagePath);

  if (downloadError || !fileData) {
    throw new Error(downloadError?.message ?? "Could not download file from storage");
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  const { text, pageCount } = await extractText(buffer, document.fileType);
  const chunks = chunkText(text);

  if (chunks.length === 0) {
    // Not necessarily an error (e.g. an image OCR pass that found no text)
    // -- mark ready but with no searchable content rather than failing.
    await prisma.document.update({
      where: { id: document.id },
      data: { processingStatus: "READY", pageCount: pageCount ?? null },
    });
    return { chunks: 0 };
  }

  const embeddings = await embedTexts(chunks);

  // Clear any partial chunks from a prior failed attempt on this document
  // before re-inserting, so a retry doesn't leave duplicate chunk rows.
  await prisma.documentChunk.deleteMany({ where: { documentId: document.id } });

  const createdChunks = await prisma.$transaction(
    chunks.map((content, i) =>
      prisma.documentChunk.create({
        data: { documentId: document.id, chunkIndex: i, content },
      })
    )
  );

  for (let i = 0; i < createdChunks.length; i++) {
    await saveChunkEmbedding(createdChunks[i].id, embeddings[i]);
  }

  await prisma.document.update({
    where: { id: document.id },
    data: { processingStatus: "READY", pageCount: pageCount ?? null },
  });

  // Best-effort: classification failing should never fail the
  // already-successful processing pipeline or trigger a pipeline retry.
  classifyAndStoreDocument(document.id).catch(() => {});

  return { chunks: createdChunks.length };
}

/** Records a pipeline failure on the Document row (used by both callers). */
export async function markDocumentFailed(documentId: string, err: unknown) {
  await prisma.document.update({
    where: { id: documentId },
    data: {
      processingStatus: "FAILED",
      errorMessage: err instanceof Error ? err.message : "Unknown processing error",
    },
  });
}
