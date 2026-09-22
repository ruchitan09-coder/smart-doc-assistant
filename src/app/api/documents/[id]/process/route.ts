import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { processDocument, markDocumentFailed } from "@/lib/process-document";

// Must run in the Node.js runtime (not Edge) -- transformers.js and pdf-parse
// both need Node APIs.
export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/documents/:id/process
// Manual/immediate trigger: runs the pipeline right now, in this request.
// Used right after upload (for fast turnaround) and by a "Retry" button in
// the UI. If this fails or times out, the ProcessingJob row created at
// upload time (see /api/documents POST) is still PENDING/claimable, so
// /api/jobs/run will pick it up and retry on its own -- this route is a
// fast path, not the only path.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const document = await prisma.document.findUnique({ where: { id: params.id } });
  if (!document || document.ownerId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const result = await processDocument(document.id);

    // Mark any pending job for this document DONE so the background worker
    // doesn't redundantly reprocess it.
    await prisma.processingJob.updateMany({
      where: { documentId: document.id, status: { in: ["PENDING", "RUNNING"] } },
      data: { status: "DONE" },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    await markDocumentFailed(document.id, err);
    // Leave the ProcessingJob row as-is (PENDING/RUNNING) so the background
    // worker retries it with backoff instead of giving up after one attempt.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
