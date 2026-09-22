"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { useToast } from "./ui/toast";

interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  documents: { id: string; fileName: string }[];
}

interface TranscriptMessage {
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
  sources: { fileName: string; pageNumber: number | null; excerpt: string }[];
}

export function ConversationsClient() {
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptMessage[] | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const { showToast } = useToast();

  async function load() {
    const res = await fetch("/api/conversations");
    const data = await res.json();
    setConversations(data.conversations ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setTranscript(null);
      return;
    }
    setExpandedId(id);
    setTranscriptLoading(true);
    const res = await fetch(`/api/conversations/${id}`);
    const data = await res.json();
    setTranscript(data.conversation?.messages ?? []);
    setTranscriptLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this conversation? This cannot be undone.")) return;
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (expandedId === id) {
      setExpandedId(null);
      setTranscript(null);
    }
    showToast("Conversation deleted", "success");
    load();
  }

  async function handleClearAll() {
    if (!conversations || conversations.length === 0) return;
    if (!confirm("Clear your entire conversation history? This cannot be undone.")) return;
    await fetch("/api/conversations", { method: "DELETE" });
    setExpandedId(null);
    setTranscript(null);
    showToast("Conversation history cleared", "success");
    load();
  }

  if (conversations === null) {
    return <p className="text-sm text-gray-500">Loading conversations...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Link href="/documents">
          <Button variant="secondary">+ New conversation</Button>
        </Link>
        <Button variant="danger" onClick={handleClearAll} disabled={conversations.length === 0}>
          Clear all
        </Button>
      </div>

      {conversations.length === 0 && (
        <p className="text-sm text-gray-500">
          No conversations yet — open a document and ask a question to start one.
        </p>
      )}

      <div className="space-y-3">
        {conversations.map((c) => (
          <Card key={c.id} className="p-4" interactive>
            <div className="flex items-start justify-between gap-3">
              <button className="text-left flex-1 min-w-0" onClick={() => toggleExpand(c.id)}>
                <p className="font-medium truncate">{c.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {c.messageCount} message{c.messageCount === 1 ? "" : "s"} ·{" "}
                  {c.documents.map((d) => d.fileName).join(", ") || "No documents"} ·{" "}
                  {new Date(c.updatedAt).toLocaleString()}
                </p>
              </button>
              <div className="flex items-center gap-2 shrink-0">
                {c.documents[0] && (
                  <Link href={`/documents/${c.documents[0].id}`}>
                    <Button variant="secondary">Open</Button>
                  </Link>
                )}
                <Button variant="danger" onClick={() => handleDelete(c.id)}>
                  Delete
                </Button>
              </div>
            </div>

            {expandedId === c.id && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
                {transcriptLoading && <p className="text-xs text-gray-400">Loading transcript...</p>}
                {!transcriptLoading &&
                  transcript?.map((m, i) => (
                    <div key={i} className={m.role === "USER" ? "text-right" : "text-left"}>
                      <div
                        className={`inline-block rounded-2xl px-4 py-2 max-w-[85%] text-sm ${
                          m.role === "USER" ? "bg-brand-500 text-white" : "bg-paper-dim dark:bg-gray-800"
                        }`}
                      >
                        <div className="prose-sm dark:prose-invert">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      </div>
                      {m.sources.length > 0 && (
                        <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                          <p className="font-medium">Sources</p>
                          {m.sources.map((s, j) => (
                            <p key={j}>
                              {s.fileName}
                              {s.pageNumber ? ` — Page ${s.pageNumber}` : ""}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
