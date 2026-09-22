import { describe, it, expect } from "vitest";
import { DOCUMENT_CLASSES, CLASS_LABELS, isDocumentClass } from "../src/lib/classifier/labels";

describe("isDocumentClass", () => {
  it("accepts every defined class", () => {
    for (const cls of DOCUMENT_CLASSES) {
      expect(isDocumentClass(cls)).toBe(true);
    }
  });

  it("rejects strings that aren't a defined class", () => {
    expect(isDocumentClass("not_a_real_class")).toBe(false);
    expect(isDocumentClass("")).toBe(false);
  });
});

describe("CLASS_LABELS", () => {
  it("has a display label for every document class, and no extras", () => {
    const labelKeys = Object.keys(CLASS_LABELS).sort();
    const classKeys = [...DOCUMENT_CLASSES].sort();
    expect(labelKeys).toEqual(classKeys);
  });

  it("has a non-empty, distinct label for every class", () => {
    const labels = Object.values(CLASS_LABELS);
    expect(labels.every((l) => l.trim().length > 0)).toBe(true);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
