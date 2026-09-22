"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface Source {
  documentId: string;
  fileName: string;
  pageNumber: number | null;
  excerpt: string;
}
interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

const SUGGESTED_PROMPTS = [
  "Summarize this document",
  "What are the key points?",
  "Explain this in simple language",
  "What are the important dates?",
  "List the action items",
  "What are the main conclusions?",
];

// Must match SOURCES_DELIMITER in src/app/api/chat/route.ts.
const SOURCES_DELIMITER = "\u0000__SOURCES__\u0000";

export function ChatPanel({ documentIds }: { documentIds: string[] }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  async function send(question: string) {
    if (!question.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);

    // Placeholder assistant message we'll fill in as chunks arrive.
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, documentIds, conversationId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errorText =
          res.status === 429
            ? data.error ?? "You're sending messages too quickly. Please wait a moment."
            : data.error ?? "Something went wrong.";
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: `⚠️ ${errorText}` };
          return next;
        });
        return;
      }

      const newConversationId = res.headers.get("X-Conversation-Id");
      if (newConversationId) setConversationId(newConversationId);

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sawSourcesDelimiter = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const delimiterIndex = buffer.indexOf(SOURCES_DELIMITER);
        if (delimiterIndex !== -1) {
          sawSourcesDelimiter = true;
          const answerPart = buffer.slice(0, delimiterIndex);
          const jsonPart = buffer.slice(delimiterIndex + SOURCES_DELIMITER.length);

          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: answerPart };
            return next;
          });

          try {
            const trailer = JSON.parse(jsonPart);
            if (trailer.conversationId) setConversationId(trailer.conversationId);
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = {
                role: "assistant",
                content: answerPart,
                sources: trailer.sources,
              };
              return next;
            });
          } catch {
            // If the trailer hasn't fully arrived yet, the next loop
            // iteration's buffer will include it -- just render the text
            // we have for now.
          }
          continue;
        }

        if (!sawSourcesDelimiter) {
          const streamedSoFar = buffer;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: streamedSoFar };
            return next;
          });
        }
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: "⚠️ Network error — please try again." };
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.length === 0 && (
          <div>
            <p className="text-sm text-gray-500 mb-3">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-xs rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={`inline-block rounded-2xl px-4 py-2 max-w-[85%] text-sm ${
                m.role === "user"
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800"
              }`}
            >
              <div className="prose-sm dark:prose-invert">
                <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
              </div>
            </div>
            {m.sources && m.sources.length > 0 && (
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
        {loading && <p className="text-xs text-gray-400">Thinking...</p>}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-800 p-3 flex gap-2">
        <Input
          placeholder="Ask a question about your document(s)..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
        />
        <Button onClick={() => send(input)} disabled={loading}>Send</Button>
        <Button variant="secondary" onClick={() => { setMessages([]); setConversationId(undefined); }}>
          New chat
        </Button>
      </div>
    </div>
  );
}
