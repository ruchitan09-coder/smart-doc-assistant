import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { classifyAndStoreDocument } from "@/lib/classify-document";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BATCH = 50;

// POST /api/documents/bulk
// body: { action: "delete" | "reclassify", documentIds: string[] }
// Applies one action to many documents at once, from the multi-select bar
// on the /documents page. Ownership is re-verified server-side for every
// id -- the request body is just a list of strings, never trusted as-is.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, documentIds } = await request.json();

  if (action !== "delete" && action !== "reclassify") {
    return NextResponse.json({ error: "action must be 'delete' or 'reclassify'" }, { status: 400 });
  }
  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    return NextResponse.json({ error: "documentIds must be a non-empty array" }, { status: 400 });
  }
  if (documentIds.length > MAX_BATCH) {
    return NextResponse.json({ error: `Cannot act on more than ${MAX_BATCH} documents at once` }, { status: 400 });
  }

  const owned = await prisma.document.findMany({
    where: { id: { in: documentIds }, ownerId: user.id },
  });
  const ownedIds = owned.map((d) => d.id);
  const skipped = documentIds.length - ownedIds.length; // not owned / already gone

  if (ownedIds.length === 0) {
    return NextResponse.json({ error: "No accessible documents found" }, { status: 403 });
  }

  if (action === "delete") {
    const admin = createAdminClient();
    const paths = owned.map((d) => d.storagePath);
    if (paths.length > 0) {
      await admin.storage.from(process.env.SUPABASE_STORAGE_BUCKET ?? "documents").remove(paths);
    }
    await prisma.document.deleteMany({ where: { id: { in: ownedIds } } }); // cascades to chunks/sources

    return NextResponse.json({ success: true, action, affected: ownedIds.length, skipped });
  }

  // action === "reclassify"
  // Only makes sense for documents that finished processing.
  const readyIds = owned.filter((d) => d.processingStatus === "READY").map((d) => d.id);
  const notReady = ownedIds.length - readyIds.length;

  const outcomes = await Promise.allSettled(readyIds.map((id) => classifyAndStoreDocument(id)));
  const failed = outcomes.filter((o) => o.status === "rejected").length;

  return NextResponse.json({
    success: true,
    action,
    affected: readyIds.length - failed,
    failed,
    skipped: skipped + notReady,
  });
}
