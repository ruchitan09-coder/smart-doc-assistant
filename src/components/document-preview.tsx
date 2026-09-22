"use client";
import { useEffect, useState } from "react";
import DOMPurify from "dompurify";

interface Props {
  fileType: string; // pdf | docx | txt | png | jpg
  fileName: string;
  signedUrl: string;
}

/**
 * Inline preview for every supported file type. PDFs and images render
 * directly via iframe (the browser handles those natively). TXT and DOCX
 * previously fell through to a bare "download the original" link -- this
 * component fetches their content client-side and renders it in place:
 *   - txt:  plain text, fetched and shown in a scrollable <pre>
 *   - docx: converted to HTML in the browser via mammoth's browser build,
 *           sanitized with DOMPurify before rendering (the file is the
 *           user's own, but dangerouslySetInnerHTML on *any* converted
 *           document content should still be sanitized -- a DOCX can embed
 *           things that map to script-bearing HTML via a buggy converter
 *           path, and this is a cheap, correct safeguard either way)
 */
export function DocumentPreview({ fileType, fileName, signedUrl }: Props) {
  if (fileType === "pdf" || fileType === "png" || fileType === "jpg") {
    return <iframe src={signedUrl} className="w-full h-full" title={fileName} />;
  }
  if (fileType === "txt") {
    return <TxtPreview signedUrl={signedUrl} />;
  }
  if (fileType === "docx") {
    return <DocxPreview signedUrl={signedUrl} />;
  }
  return (
    <div className="p-6 text-sm text-gray-500">
      Preview isn't available for this file type yet — but it's fully indexed
      and ready to chat with on the right.
      <a href={signedUrl} className="text-brand-500 block mt-2" target="_blank" rel="noreferrer">
        Download original file
      </a>
    </div>
  );
}

function TxtPreview({ signedUrl }: { signedUrl: string }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(signedUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.text();
      })
      .then((t) => !cancelled && setText(t))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [signedUrl]);

  if (error) {
    return <p className="p-6 text-sm text-red-600">Couldn't load the file for preview.</p>;
  }
  if (text === null) {
    return <p className="p-6 text-sm text-gray-400">Loading preview...</p>;
  }
  return (
    <pre className="p-4 text-sm whitespace-pre-wrap break-words overflow-auto h-full font-mono">
      {text}
    </pre>
  );
}

function DocxPreview({ signedUrl }: { signedUrl: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch(signedUrl);
        if (!res.ok) throw new Error("Failed to fetch");
        const arrayBuffer = await res.arrayBuffer();

        // Browser build of mammoth (as opposed to the Node build used
        // server-side in src/lib/extract.ts) -- dynamically imported so it's
        // only ever pulled into the client bundle for documents that
        // actually need it.
        const mammoth = await import("mammoth/mammoth.browser");
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const clean = DOMPurify.sanitize(result.value);
        if (!cancelled) setHtml(clean);
      } catch {
        if (!cancelled) setError(true);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [signedUrl]);

  if (error) {
    return (
      <p className="p-6 text-sm text-red-600">
        Couldn't render a preview of this document.{" "}
        <a href={signedUrl} className="text-brand-500 underline" target="_blank" rel="noreferrer">
          Download it instead
        </a>
        .
      </p>
    );
  }
  if (html === null) {
    return <p className="p-6 text-sm text-gray-400">Rendering preview...</p>;
  }
  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none p-6 overflow-auto h-full"
      // Sanitized above via DOMPurify -- see comment on DocxPreview.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
