import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { embedQuery } from "@/lib/embeddings";
import { findRelevantChunks } from "@/lib/vector";

export const runtime = "nodejs";

// GET /api/search?q=...
// Global natural-language search across all of the user's documents.
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  if (!q) return NextResponse.json({ results: [] });

  const documents = await prisma.document.findMany({
    where: { ownerId: user.id },
    select: { id: true },
  });
  const documentIds = documents.map((d) => d.id);
  if (documentIds.length === 0) return NextResponse.json({ results: [] });

  const queryEmbedding = await embedQuery(q);
  const matches = await findRelevantChunks(queryEmbedding, documentIds, 10);

  return NextResponse.json({
    results: matches.map((m) => ({
      documentId: m.documentId,
      fileName: m.fileName,
      pageNumber: m.pageNumber,
      excerpt: m.content.slice(0, 300),
      relevance: (1 - m.distance).toFixed(3), // cosine distance -> similarity
    })),
  });
}
