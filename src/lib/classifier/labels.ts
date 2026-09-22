// The fixed set of document categories the custom-trained model predicts.
// Keep this list in sync with ml/data (Python training pipeline) --
// see ml/README.md.

export const DOCUMENT_CLASSES = [
  "invoice",
  "contract",
  "research_paper",
  "resume",
  "report",
  "assignment",
  "policy",
  "receipt",
  "legal_document",
  "business_document",
] as const;

export type DocumentClass = (typeof DOCUMENT_CLASSES)[number];

export const CLASS_LABELS: Record<DocumentClass, string> = {
  invoice: "Invoice",
  contract: "Contract",
  research_paper: "Research Paper",
  resume: "Resume",
  report: "Report",
  assignment: "Assignment",
  policy: "Policy",
  receipt: "Receipt",
  legal_document: "Legal Document",
  business_document: "Business Document",
};

export function isDocumentClass(value: string): value is DocumentClass {
  return (DOCUMENT_CLASSES as readonly string[]).includes(value);
}
