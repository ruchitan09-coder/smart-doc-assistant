import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { PageHeader } from "@/components/page-header";
import { SearchClient } from "@/components/search-client";

export default async function SearchPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  return (
    <div>
      <Navbar userEmail={user.email} />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <PageHeader
          icon="🔎"
          title="Search your documents"
          subtitle="Search across every document in your library using natural language."
        />
        <SearchClient />
      </div>
    </div>
  );
}
