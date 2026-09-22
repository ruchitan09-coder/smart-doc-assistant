import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/conversations/:id -- full transcript, for expanding a row on the
// /conversations page without leaving it.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sourceReferences: {
            include: { document: { select: { fileName: true } } },
          },
        },
      },
    },
  });
  if (!conversation || conversation.ownerId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      title: conversation.title,
      messages: conversation.messages.map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
        sources: m.sourceReferences.map((s) => ({
          fileName: s.document.fileName,
          pageNumber: s.pageNumber,
          excerpt: s.excerpt,
        })),
      })),
    },
  });
}

// DELETE /api/conversations/:id
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversation = await prisma.conversation.findUnique({ where: { id: params.id } });
  if (!conversation || conversation.ownerId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.conversation.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
