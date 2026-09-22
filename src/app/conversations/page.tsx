import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { PageHeader } from "@/components/page-header";
import { ConversationsClient } from "@/components/conversations-client";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  return (
    <div>
      <Navbar userEmail={user.email} />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <PageHeader
          icon="💬"
          title="Conversations"
          subtitle="Your chat history with the AI assistant across all documents."
        />
        <ConversationsClient />
      </div>
    </div>
  );
}
