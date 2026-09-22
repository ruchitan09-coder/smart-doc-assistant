import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { classifyAndStoreDocument } from "@/lib/classify-document";

// Needs Node.js runtime: the local fallback classifier trains in-process,
// and downstream it may call out to the Python inference service.
export const runtime = "nodejs";
export const maxDuration = 30;

// POST /api/documents/:id/classify
// Runs the custom-trained document classification model (remote Python
// service if MODEL_API_URL is set, otherwise the local in-app TF-IDF +
// logistic regression classifier) and stores the result as a ModelPrediction.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const document = await prisma.document.findUnique({ where: { id: params.id } });
  if (!document || document.ownerId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (document.processingStatus !== "READY") {
    return NextResponse.json(
      { error: "Document must finish processing before it can be classified" },
      { status: 409 }
    );
  }

  try {
    const prediction = await classifyAndStoreDocument(document.id);
    return NextResponse.json({ prediction }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Classification failed" },
      { status: 500 }
    );
  }
}
