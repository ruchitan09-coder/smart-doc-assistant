import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { Card } from "@/components/ui/card";
import { UploadDropzone } from "@/components/upload-dropzone";
import { DocumentList } from "@/components/document-list";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const documents = await prisma.document.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <Navbar userEmail={user.email} />
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <PageHeader icon="📁" title="Documents" subtitle="Upload, organize, and manage your document library." />

        <Card className="p-6">
          <UploadDropzone />
        </Card>

        <DocumentList
          documents={documents.map((d) => ({
            id: d.id,
            fileName: d.fileName,
            fileType: d.fileType,
            fileSizeBytes: d.fileSizeBytes,
            processingStatus: d.processingStatus,
            pageCount: d.pageCount,
            createdAt: d.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
