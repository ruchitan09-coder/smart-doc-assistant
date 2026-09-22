import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { DeleteAccountButton } from "@/components/delete-account-button";
import { PageHeader } from "@/components/page-header";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const documentCount = await prisma.document.count({ where: { ownerId: user.id } });

  return (
    <div>
      <Navbar userEmail={user.email} />
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        <PageHeader icon="⚙️" title="Settings" subtitle="Manage your profile, appearance, and account." />

        <Card className="p-6">
          <h2 className="font-semibold mb-3">Profile</h2>
          <p className="text-sm text-gray-500">Email</p>
          <p className="mb-3">{user.email}</p>
          <p className="text-sm text-gray-500">Member since</p>
          <p>{new Date(user.created_at).toLocaleDateString()}</p>
        </Card>

        <Card className="p-6 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Appearance</h2>
            <p className="text-sm text-gray-500">Light, dark, or match your system.</p>
          </div>
          <ThemeToggle />
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold mb-1">Data & privacy</h2>
          <p className="text-sm text-gray-500">
            You have {documentCount} document(s) stored. Documents and conversations
            are private to your account and are never publicly accessible.
          </p>
        </Card>

        <Card className="p-6 border-red-200 dark:border-red-900">
          <h2 className="font-semibold mb-1 text-red-600">Danger zone</h2>
          <p className="text-sm text-gray-500 mb-3">
            Permanently delete your account and all associated documents and conversations.
            This cannot be undone.
          </p>
          <DeleteAccountButton />
        </Card>
      </div>
    </div>
  );
}
