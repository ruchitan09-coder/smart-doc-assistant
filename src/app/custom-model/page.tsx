import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { CustomModelClient } from "@/components/custom-model-client";
import { DOCUMENT_CLASSES, CLASS_LABELS, LOCAL_MODEL_VERSION } from "@/lib/classifier";

export const dynamic = "force-dynamic";

export default async function CustomModelPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [readyDocuments, predictions] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: user.id, processingStatus: "READY" },
      select: { id: true, fileName: true },
      orderBy: { fileName: "asc" },
    }),
    prisma.modelPrediction.findMany({
      where: { document: { ownerId: user.id } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { document: { select: { id: true, fileName: true, fileType: true } } },
    }),
  ]);

  const isRemoteConfigured = Boolean(process.env.MODEL_API_URL);

  return (
    <div>
      <Navbar userEmail={user.email} />
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <PageHeader
          icon="🧠"
          title="Custom-Trained Model"
          subtitle="Document classification powered by a custom-trained AI model, with confidence scores and version tracking."
        />

        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="p-5">
            <p className="text-sm text-gray-500">Active model</p>
            <p className="text-lg font-semibold mt-1 text-brand-500">
              {isRemoteConfigured ? "Remote (Python service)" : "Local (in-app)"}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-gray-500">Model version</p>
            <p className="text-lg font-semibold mt-1 text-brand-500">
              {isRemoteConfigured ? "set by ml/service" : LOCAL_MODEL_VERSION}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-gray-500">Categories</p>
            <p className="text-lg font-semibold mt-1 text-brand-500">{DOCUMENT_CLASSES.length}</p>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="font-semibold mb-1">Classes</h2>
          <p className="text-sm text-gray-500 mb-3">
            Every document is classified into one of the following categories.
          </p>
          <div className="flex flex-wrap gap-2">
            {DOCUMENT_CLASSES.map((c) => (
              <span
                key={c}
                className="text-xs rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1"
              >
                {CLASS_LABELS[c]}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            {isRemoteConfigured
              ? "Predictions are served by the trained model in ml/ (DistilBERT or TF-IDF baseline), running as its own inference service."
              : "Running on the built-in TF-IDF + logistic regression classifier (trains in-process, no external service). Set MODEL_API_URL to switch to the trained Python model in ml/ instead — see ml/README.md."}
          </p>
        </Card>

        <CustomModelClient
          documents={readyDocuments}
          initialPredictions={predictions.map((p) => ({
            id: p.id,
            documentId: p.documentId,
            fileName: p.document.fileName,
            fileType: p.document.fileType,
            predictedClass: p.predictedClass,
            confidence: p.confidence,
            scores: p.scores as Record<string, number>,
            modelVersion: p.modelVersion,
            modelSource: p.modelSource,
            createdAt: p.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
