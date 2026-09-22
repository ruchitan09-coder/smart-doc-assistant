import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/conversations -- list the current user's conversation history
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      conversationDocs: {
        include: { document: { select: { id: true, fileName: true } } },
      },
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({
    conversations: conversations.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c._count.messages,
      documents: c.conversationDocs.map((cd) => cd.document),
    })),
  });
}

// DELETE /api/conversations -- clear all conversation history for the user
export async function DELETE() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.conversation.deleteMany({ where: { ownerId: user.id } }); // cascades to messages/source refs

  return NextResponse.json({ success: true });
}
