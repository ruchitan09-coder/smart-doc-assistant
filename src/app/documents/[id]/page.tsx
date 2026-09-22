import { notFound, redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { DocumentChatWrapper } from "@/components/document-chat-wrapper";
import { DocumentPreview } from "@/components/document-preview";
import { fileTypeIcon, statusPillClass } from "@/lib/ui-helpers";

export const dynamic = "force-dynamic";

export default async function DocumentViewerPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const document = await prisma.document.findUnique({ where: { id: params.id } });
  if (!document || document.ownerId !== user.id) notFound();

  const allDocuments = await prisma.document.findMany({
    where: { ownerId: user.id, processingStatus: "READY" },
    select: { id: true, fileName: true },
    orderBy: { fileName: "asc" },
  });

  // Signed URL so the (private) file can be previewed in the browser without
  // making the storage bucket public.
  const admin = createAdminClient();
  const { data: signedUrlData } = await admin.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET ?? "documents")
    .createSignedUrl(document.storagePath, 60 * 60); // 1 hour

  return (
    <div className="h-screen flex flex-col">
      <Navbar userEmail={user.email} />
      <div className="flex-1 grid md:grid-cols-2 min-h-0">
        {/* Left: document viewer */}
        <div className="border-r border-gray-200 dark:border-gray-800 flex flex-col min-h-0">
          <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg shrink-0">{fileTypeIcon(document.fileType)}</span>
              <div className="min-w-0">
                <p className="font-medium truncate">{document.fileName}</p>
                <p className="text-xs text-gray-500">
                  {document.fileType.toUpperCase()}
                  {document.pageCount ? ` · ${document.pageCount} pages` : ""}
                </p>
              </div>
            </div>
            <span className={statusPillClass(document.processingStatus)}>{document.processingStatus}</span>
          </div>
          <div className="flex-1 min-h-0">
            {document.processingStatus === "FAILED" && (
              <div className="p-6 text-sm text-red-600">
                Processing failed: {document.errorMessage ?? "Unknown error"}
              </div>
            )}
            {document.processingStatus !== "FAILED" && signedUrlData?.signedUrl && (
              <DocumentPreview
                fileType={document.fileType}
                fileName={document.fileName}
                signedUrl={signedUrlData.signedUrl}
              />
            )}
          </div>
        </div>

        {/* Right: AI chat */}
        <div className="min-h-0">
          {document.processingStatus === "READY" ? (
            <DocumentChatWrapper currentDocId={document.id} allDocuments={allDocuments} />
          ) : (
            <div className="p-6 text-sm text-gray-500">
              This document is still {document.processingStatus.toLowerCase()} — chat will be
              available once it's ready.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
