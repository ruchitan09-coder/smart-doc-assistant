"use client";
import { useState } from "react";
import { ChatPanel } from "./chat-panel";

interface DocOption {
  id: string;
  fileName: string;
}

export function DocumentChatWrapper({
  currentDocId,
  allDocuments,
}: {
  currentDocId: string;
  allDocuments: DocOption[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([currentDocId]);
  const otherDocs = allDocuments.filter((d) => d.id !== currentDocId);

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <div className="flex flex-col h-full">
      {otherDocs.length > 0 && (
        <div className="border-b border-gray-200 dark:border-gray-800 p-3">
          <p className="text-xs text-gray-500 mb-2">
            Multi-document chat — include other documents:
          </p>
          <div className="flex flex-wrap gap-2">
            {otherDocs.map((d) => (
              <label
                key={d.id}
                className="flex items-center gap-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-full px-2.5 py-1 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(d.id)}
                  onChange={() => toggle(d.id)}
                />
                {d.fileName}
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0">
        <ChatPanel documentIds={selectedIds} key={selectedIds.join(",")} />
      </div>
    </div>
  );
}
