// Raw-SQL helpers for the pgvector column, since Prisma's query builder
// doesn't natively support inserting/querying `vector` type values.
import { prisma } from "./prisma";

function toVectorLiteral(embedding: number[]): string {
  // pgvector accepts a string literal like '[0.1,0.2,0.3]'
  return `[${embedding.join(",")}]`;
}

export async function saveChunkEmbedding(chunkId: string, embedding: number[]) {
  const literal = toVectorLiteral(embedding);
  await prisma.$executeRawUnsafe(
    `UPDATE "DocumentChunk" SET embedding = $1::vector WHERE id = $2`,
    literal,
    chunkId
  );
}

export interface RetrievedChunk {
  id: string;
  documentId: string;
  content: string;
  pageNumber: number | null;
  fileName: string;
  distance: number;
}

// Cosine-distance nearest-neighbor search, restricted to a set of document
// IDs the caller is allowed to see (enforces "users only access their own
// documents" at the query level, in addition to Postgres RLS).
export async function findRelevantChunks(
  queryEmbedding: number[],
  documentIds: string[],
  topK = 5
): Promise<RetrievedChunk[]> {
  if (documentIds.length === 0) return [];
  const literal = toVectorLiteral(queryEmbedding);

  const rows = await prisma.$queryRawUnsafe<RetrievedChunk[]>(
    `
    SELECT
      dc.id,
      dc."documentId",
      dc.content,
      dc."pageNumber",
      d."fileName",
      (dc.embedding <=> $1::vector) AS distance
    FROM "DocumentChunk" dc
    JOIN "Document" d ON d.id = dc."documentId"
    WHERE dc."documentId" = ANY($2::text[])
      AND dc.embedding IS NOT NULL
    ORDER BY dc.embedding <=> $1::vector
    LIMIT $3
    `,
    literal,
    documentIds,
    topK
  );

  return rows;
}
