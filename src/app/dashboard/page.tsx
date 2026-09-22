import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { Card } from "@/components/ui/card";
import { UploadDropzone } from "@/components/upload-dropzone";
import { PageHeader } from "@/components/page-header";
import { fileTypeIcon, statusPillClass } from "@/lib/ui-helpers";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [documentCount, recentDocuments, recentConversations, storageBytes] = await Promise.all([
    prisma.document.count({ where: { ownerId: user.id } }),
    prisma.document.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.conversation.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.document.aggregate({
      where: { ownerId: user.id },
      _sum: { fileSizeBytes: true },
    }),
  ]);

  const storageMb = ((storageBytes._sum.fileSizeBytes ?? 0) / (1024 * 1024)).toFixed(1);

  return (
    <div>
      <Navbar userEmail={user.email} />
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <PageHeader
          icon="👋"
          title={`Welcome back${user.email ? `, ${user.email.split("@")[0]}` : ""}`}
          subtitle="Here's what's happening with your documents."
        />

        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="p-5 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-500">Documents</p>
            <p className="text-3xl font-bold mt-1 text-brand-500">{documentCount}</p>
          </Card>
          <Card className="p-5 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-500">Storage used</p>
            <p className="text-3xl font-bold mt-1 text-brand-500">{storageMb} <span className="text-base font-medium text-gray-400">MB</span></p>
          </Card>
          <Card className="p-5 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-500">Conversations</p>
            <p className="text-3xl font-bold mt-1 text-brand-500">{recentConversations.length}</p>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="font-semibold mb-3">Upload a document</h2>
          <UploadDropzone />
        </Card>

        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            href="/documents"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
          >
            📄 Summarize a document
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
          >
            🔎 Search documents
          </Link>
        </div>

        <div>
          <h2 className="font-semibold mb-3">Recent documents</h2>
          <div className="space-y-2">
            {recentDocuments.length === 0 && (
              <p className="text-sm text-gray-500">No documents yet — upload your first one above.</p>
            )}
            {recentDocuments.map((doc) => (
              <Link key={doc.id} href={`/documents/${doc.id}`}>
                <Card className="p-4 flex items-center justify-between hover:border-brand-500 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{fileTypeIcon(doc.fileType)}</span>
                    <div>
                      <p className="font-medium">{doc.fileName}</p>
                      <p className="text-xs text-gray-500">{doc.fileType.toUpperCase()}</p>
                    </div>
                  </div>
                  <span className={statusPillClass(doc.processingStatus)}>{doc.processingStatus}</span>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
