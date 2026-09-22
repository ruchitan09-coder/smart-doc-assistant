import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processDocument, markDocumentFailed } from "@/lib/process-document";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_JOBS_PER_RUN = 5;
const STALE_LOCK_MINUTES = 10; // a RUNNING job with no update in this long is assumed crashed and reclaimable

// POST /api/jobs/run
// Background worker: claims a small batch of due ProcessingJob rows and
// runs the pipeline for each. Meant to be called periodically -- either by
// Vercel Cron (see vercel.json) or any external scheduler (e.g.
// cron-job.org) hitting this URL every few minutes with the CRON_SECRET
// below. This is what actually makes processing retryable: if the
// immediate attempt in /api/documents/:id/process fails or the serverless
// function is killed mid-run, the job stays PENDING (or a stale RUNNING)
// and gets picked up here with backoff, up to maxAttempts.
//
// Auth: accepts either
//   - Vercel Cron's own request (identified by the `x-vercel-cron` header
//     Vercel adds automatically -- no secret needed, Vercel controls that
//     header and it can't be set by outside callers), or
//   - Authorization: Bearer <CRON_SECRET> for any other scheduler.
export async function POST(request: Request) {
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;
  const authHeader = request.headers.get("authorization");
  const hasValidSecret =
    process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isVercelCron && !hasValidSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staleThreshold = new Date(Date.now() - STALE_LOCK_MINUTES * 60 * 1000);

  // Claim due jobs: PENDING jobs whose nextRunAt has passed, or RUNNING
  // jobs whose lock has gone stale (the worker that claimed them presumably
  // crashed). One job per document at a time is enough for this app's scale.
  const claimable = await prisma.processingJob.findMany({
    where: {
      OR: [
        { status: "PENDING", nextRunAt: { lte: new Date() } },
        { status: "RUNNING", lockedAt: { lte: staleThreshold } },
      ],
    },
    orderBy: { nextRunAt: "asc" },
    take: MAX_JOBS_PER_RUN,
  });

  const results = [];

  for (const job of claimable) {
    // Re-claim atomically: only proceed if this job is still in the state
    // we read it in (guards against two overlapping worker runs racing the
    // same job).
    const claim = await prisma.processingJob.updateMany({
      where: { id: job.id, status: job.status },
      data: { status: "RUNNING", lockedAt: new Date() },
    });
    if (claim.count === 0) continue; // another worker run beat us to it

    try {
      const result = await processDocument(job.documentId);
      await prisma.processingJob.update({
        where: { id: job.id },
        data: { status: "DONE" },
      });
      results.push({ jobId: job.id, documentId: job.documentId, status: "done", ...result });
    } catch (err) {
      const attempts = job.attempts + 1;
      const message = err instanceof Error ? err.message : "Unknown processing error";

      if (attempts >= job.maxAttempts) {
        await prisma.processingJob.update({
          where: { id: job.id },
          data: { status: "FAILED", attempts, lastError: message },
        });
        await markDocumentFailed(job.documentId, err);
        results.push({ jobId: job.id, documentId: job.documentId, status: "failed", error: message });
      } else {
        // Exponential backoff: 1 min, 4 min, 9 min, ... before the next attempt.
        const backoffMinutes = attempts * attempts;
        await prisma.processingJob.update({
          where: { id: job.id },
          data: {
            status: "PENDING",
            attempts,
            lastError: message,
            nextRunAt: new Date(Date.now() + backoffMinutes * 60 * 1000),
          },
        });
        results.push({ jobId: job.id, documentId: job.documentId, status: "retry_scheduled", attempts, error: message });
      }
    }
  }

  return NextResponse.json({ claimed: claimable.length, results });
}
