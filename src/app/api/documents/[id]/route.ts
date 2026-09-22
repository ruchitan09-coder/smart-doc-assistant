import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function getOwnedDocument(userId: string, id: string) {
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document || document.ownerId !== userId) return null;
  return document;
}

// GET /api/documents/:id
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const document = await getOwnedDocument(user.id, params.id);
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ document });
}

// PATCH /api/documents/:id -- rename
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const document = await getOwnedDocument(user.id, params.id);
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { fileName } = await req.json();
  if (!fileName || typeof fileName !== "string") {
    return NextResponse.json({ error: "fileName is required" }, { status: 400 });
  }

  const updated = await prisma.document.update({
    where: { id: params.id },
    data: { fileName },
  });
  return NextResponse.json({ document: updated });
}

// DELETE /api/documents/:id
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const document = await getOwnedDocument(user.id, params.id);
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createAdminClient();
  await admin.storage.from(process.env.SUPABASE_STORAGE_BUCKET ?? "documents").remove([document.storagePath]);
  await prisma.document.delete({ where: { id: params.id } }); // cascades to chunks/sources

  return NextResponse.json({ success: true });
}
