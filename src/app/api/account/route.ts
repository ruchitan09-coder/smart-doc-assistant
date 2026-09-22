import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// DELETE /api/account -- permanently deletes the user's data and auth account
export async function DELETE() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const documents = await prisma.document.findMany({ where: { ownerId: user.id } });
  const admin = createAdminClient();

  if (documents.length > 0) {
    await admin.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET ?? "documents")
      .remove(documents.map((d) => d.storagePath));
  }

  // Cascades to documents, chunks, conversations, messages, source references.
  await prisma.user.delete({ where: { id: user.id } });
  await admin.auth.admin.deleteUser(user.id);
  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}
