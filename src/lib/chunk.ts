// Splits extracted document text into overlapping chunks for embedding.
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;

export function chunkText(
  text: string,
  chunkSize = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP
): string[] {
  const cleaned = text.trim();
  if (!cleaned) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = start + chunkSize;
    chunks.push(cleaned.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks;
}
