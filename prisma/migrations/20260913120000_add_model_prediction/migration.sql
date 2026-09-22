-- CreateTable
CREATE TABLE "ModelPrediction" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "modelSource" TEXT NOT NULL DEFAULT 'local',
    "predictedClass" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "scores" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModelPrediction_documentId_idx" ON "ModelPrediction"("documentId");

-- AddForeignKey
ALTER TABLE "ModelPrediction" ADD CONSTRAINT "ModelPrediction_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
