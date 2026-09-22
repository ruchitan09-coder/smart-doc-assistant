import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/model/predictions[?documentId=...]
// Lists classification predictions for documents the current user owns,
// most recent first.
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId") ?? undefined;

  const predictions = await prisma.modelPrediction.findMany({
    where: {
      document: { ownerId: user.id },
      ...(documentId ? { documentId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { document: { select: { id: true, fileName: true, fileType: true } } },
  });

  return NextResponse.json({ predictions });
}
