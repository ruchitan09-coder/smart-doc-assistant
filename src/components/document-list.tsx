"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { fileTypeIcon, statusPillClass } from "@/lib/ui-helpers";

interface Doc {
  id: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  processingStatus: string;
  pageCount: number | null;
  createdAt: string;
}

export function DocumentList({ documents }: { documents: Doc[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "name">("date");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const filtered = useMemo(() => {
    let list = documents.filter((d) =>
      d.fileName.toLowerCase().includes(query.toLowerCase())
    );
    if (typeFilter !== "all") list = list.filter((d) => d.fileType === typeFilter);
    list = [...list].sort((a, b) =>
      sortBy === "name"
        ? a.fileName.localeCompare(b.fileName)
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return list;
  }, [documents, query, typeFilter, sortBy]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((d) => d.id))
    );
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleRename(id: string, currentName: string) {
    const newName = prompt("New file name", currentName);
    if (!newName || newName === currentName) return;
    await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: newName }),
    });
    router.refresh();
  }

  async function handleBulkAction(action: "delete" | "reclassify") {
    const count = selected.size;
    if (count === 0) return;
    if (
      action === "delete" &&
      !confirm(`Delete ${count} document${count > 1 ? "s" : ""}? This cannot be undone.`)
    ) {
      return;
    }

    setBulkBusy(true);
    try {
      const res = await fetch("/api/documents/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, documentIds: [...selected] }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Bulk action failed.");
        return;
      }
      setSelected(new Set());
      router.refresh();
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <Input
          placeholder="Search documents by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
        >
          <option value="all">All types</option>
          <option value="pdf">PDF</option>
          <option value="docx">DOCX</option>
          <option value="txt">TXT</option>
          <option value="png">PNG</option>
          <option value="jpg">JPG</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "date" | "name")}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
        >
          <option value="date">Sort by date</option>
          <option value="name">Sort by name</option>
        </select>

        {filtered.length > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-gray-500 ml-auto cursor-pointer">
            <input
              type="checkbox"
              checked={selected.size > 0 && selected.size === filtered.length}
              onChange={toggleSelectAll}
            />
            Select all ({filtered.length})
          </label>
        )}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/40 px-4 py-2.5">
          <span className="text-sm font-medium">
            {selected.size} selected
          </span>
          <Button
            variant="secondary"
            disabled={bulkBusy}
            onClick={() => handleBulkAction("reclassify")}
          >
            Reclassify
          </Button>
          <Button variant="danger" disabled={bulkBusy} onClick={() => handleBulkAction("delete")}>
            Delete
          </Button>
          <Button variant="ghost" disabled={bulkBusy} onClick={() => setSelected(new Set())}>
            Clear selection
          </Button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {filtered.map((doc) => (
          <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start gap-2">
              <label className="flex items-start gap-2 min-w-0 flex-1 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 shrink-0"
                  checked={selected.has(doc.id)}
                  onChange={() => toggleSelected(doc.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <Link
                  href={`/documents/${doc.id}`}
                  className="flex items-center gap-2 font-medium hover:text-brand-500 min-w-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-lg shrink-0">{fileTypeIcon(doc.fileType)}</span>
                  <span className="truncate">{doc.fileName}</span>
                </Link>
              </label>
              <span className={statusPillClass(doc.processingStatus)}>{doc.processingStatus}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 pl-6">
              {doc.fileType.toUpperCase()} · {(doc.fileSizeBytes / 1024).toFixed(0)} KB
              {doc.pageCount ? ` · ${doc.pageCount} pages` : ""} ·{" "}
              {new Date(doc.createdAt).toLocaleDateString()}
            </p>
            <div className="flex gap-2 mt-3 pl-6">
              <Button variant="secondary" onClick={() => handleRename(doc.id, doc.fileName)}>
                Rename
              </Button>
              <Button variant="danger" onClick={() => handleDelete(doc.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-gray-500">No documents match your filters.</p>
        )}
      </div>
    </div>
  );
}
