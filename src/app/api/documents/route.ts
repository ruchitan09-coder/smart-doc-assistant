import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { enforceRateLimit, RateLimitExceededError } from "@/lib/rate-limit";

export const runtime = "nodejs";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
  "image/png": "png",
  "image/jpeg": "jpg",
};
const MAX_SIZE_BYTES = 20 * 1024 * 1024;

// GET /api/documents -- list the current user's documents
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const documents = await prisma.document.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ documents });
}

// POST /api/documents -- upload a new document, store it, and kick off processing
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateUser(user);

  // 10 uploads per hour per user -- generous for normal use, cheap insurance
  // against a script hammering the (non-free) embedding/classification pipeline.
  try {
    await enforceRateLimit(`upload:${user.id}`, 10, 3600);
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json(
        { error: "Too many uploads. Please slow down and try again shortly." },
        { status: 429, headers: { "Retry-After": String(err.result.retryAfterSeconds) } }
      );
    }
    throw err;
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const fileType = ALLOWED_TYPES[file.type];
  if (!fileType) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });
  }

  const admin = createAdminClient();
  const storagePath = `${user.id}/${uuidv4()}-${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET ?? "documents")
    .upload(storagePath, buffer, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const document = await prisma.document.create({
    data: {
      ownerId: user.id,
      fileName: file.name,
      fileType,
      fileSizeBytes: file.size,
      storagePath,
      processingStatus: "UPLOADING",
    },
  });

  // Create the durable job row first -- this is the source of truth for
  // "this document still needs processing". Even if the instant-trigger
  // fetch below never completes (cold start timeout, network blip, the
  // serverless function getting killed), this row stays PENDING and
  // /api/jobs/run will pick it up and retry with backoff. See
  // src/lib/process-document.ts and src/app/api/jobs/run/route.ts.
  await prisma.processingJob.create({ data: { documentId: document.id } });

  // Fire-and-forget instant trigger, purely for fast UX on the happy path --
  // most documents finish before the next poll of the UI. Its failure is
  // not load-bearing; the job row above is.
  fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/documents/${document.id}/process`, {
    method: "POST",
    headers: { cookie: request.headers.get("cookie") ?? "" },
  }).catch(() => {
    // Intentionally ignored -- the ProcessingJob row is the real fallback.
  });

  return NextResponse.json({ document }, { status: 201 });
}
