"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

const ACCEPTED_TYPES = [".pdf", ".docx", ".txt", ".png", ".jpg", ".jpeg"];
const MAX_SIZE_MB = 20;

export function UploadDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadFiles(files: FileList) {
    setUploading(true);
    for (const file of Array.from(files)) {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!ACCEPTED_TYPES.includes(ext)) {
        setStatus(`Unsupported file type: ${file.name}`);
        continue;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setStatus(`File too large (max ${MAX_SIZE_MB}MB): ${file.name}`);
        continue;
      }

      setStatus(`Uploading ${file.name}...`);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/documents", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setStatus(`Upload failed for ${file.name}: ${body.error ?? "unknown error"}`);
        continue;
      }
      setStatus(`${file.name} uploaded — processing...`);
    }
    setUploading(false);
    router.refresh();
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
      }}
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
        dragging ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-gray-300 dark:border-gray-700"
      }`}
    >
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Drag and drop a PDF, DOCX, TXT, or image here
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={(e) => e.target.files && uploadFiles(e.target.files)}
      />
      <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? "Uploading..." : "Choose file"}
      </Button>
      {status && <p className="text-xs text-gray-500 mt-3">{status}</p>}
    </div>
  );
}
