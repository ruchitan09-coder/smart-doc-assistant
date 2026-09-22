import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// Handles the Supabase email-confirmation redirect: exchanges the auth code
// for a session, then ensures a matching row exists in our own User table.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      await prisma.user.upsert({
        where: { id: data.user.id },
        update: { email: data.user.email ?? "" },
        create: { id: data.user.id, email: data.user.email ?? "" },
      });
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
