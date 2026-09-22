// Extracts raw text from an uploaded file buffer, based on its type.

export async function extractText(
  buffer: Buffer,
  fileType: string
): Promise<{ text: string; pageCount?: number }> {
  switch (fileType) {
    case "pdf": {
      const pdfParse = (await import("pdf-parse")).default;
      const result = await pdfParse(buffer);
      return { text: result.text, pageCount: result.numpages };
    }
    case "docx": {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value };
    }
    case "txt": {
      return { text: buffer.toString("utf-8") };
    }
    case "png":
    case "jpg":
    case "jpeg": {
      return { text: await extractTextFromImage(buffer) };
    }
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

// OCR via tesseract.js -- pure JS/WASM, runs in-process like the embedding
// model, no external API or paid service required. A fresh worker is
// created per call rather than kept as a long-lived singleton: this app
// runs on serverless functions, where "long-lived" doesn't mean much and a
// leftover worker from a previous invocation can't be reused anyway.
async function extractTextFromImage(buffer: Buffer): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");

  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return text.trim();
  } catch (err) {
    // OCR failing shouldn't fail the whole pipeline -- the document still
    // gets stored and viewable, just without searchable/chattable text,
    // same as the old stubbed-out behavior. Surface *something* useful in
    // logs rather than swallowing it silently.
    console.error("OCR extraction failed:", err);
    return "";
  } finally {
    await worker.terminate();
  }
}
