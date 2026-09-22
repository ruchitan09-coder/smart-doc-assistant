import { describe, it, expect } from "vitest";
import { chunkText } from "../src/lib/chunk";

describe("chunkText", () => {
  it("returns no chunks for empty input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   ")).toEqual([]);
  });

  it("returns a single chunk when text is shorter than chunk size", () => {
    const chunks = chunkText("short text", 1000, 150);
    expect(chunks).toEqual(["short text"]);
  });

  it("splits long text into overlapping chunks", () => {
    const text = "a".repeat(2500);
    const chunks = chunkText(text, 1000, 150);
    expect(chunks.length).toBeGreaterThan(1);
    // Overlap: end of one chunk should reappear at the start of the next.
    expect(chunks[0].slice(-150)).toEqual(chunks[1].slice(0, 150));
  });
});
