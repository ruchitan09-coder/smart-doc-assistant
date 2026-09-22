"use client";
import { useEffect, useState } from "react";

const DEMO = [
  {
    q: "What was our Q3 revenue growth?",
    a: "Revenue grew 32% year over year, reaching $2.4M in FY2025-26.",
    source: "financials.pdf — Page 2",
  },
  {
    q: "What are the main risks mentioned?",
    a: "Increasing competition from larger platforms and reliance on a small number of enterprise clients.",
    source: "risk-report.docx — Page 4",
  },
  {
    q: "Summarize the key action items",
    a: "Expand into Southeast Asia by Q3, launch a mobile app, and hire 10 more engineers.",
    source: "roadmap.pdf — Page 1",
  },
];

const TYPE_SPEED = 22;
const HOLD_MS = 1800;

export function ChatDemo() {
  const [cycle, setCycle] = useState(0);
  const [typedQ, setTypedQ] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    const item = DEMO[cycle % DEMO.length];
    setTypedQ("");
    setShowAnswer(false);

    let i = 0;
    const typeInterval = setInterval(() => {
      i++;
      setTypedQ(item.q.slice(0, i));
      if (i >= item.q.length) {
        clearInterval(typeInterval);
        setTimeout(() => setShowAnswer(true), 300);
      }
    }, TYPE_SPEED);

    return () => clearInterval(typeInterval);
  }, [cycle]);

  useEffect(() => {
    if (!showAnswer) return;
    const timeout = setTimeout(() => setCycle((c) => c + 1), HOLD_MS + 1500);
    return () => clearTimeout(timeout);
  }, [showAnswer]);

  const current = DEMO[cycle % DEMO.length];

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <span className="ml-3 text-xs text-gray-400">AI Chat — financials.pdf</span>
      </div>
      <div className="p-5 min-h-[220px] flex flex-col justify-end gap-3">
        <div className="self-end max-w-[85%] bg-brand-600 text-white text-sm rounded-2xl rounded-br-sm px-4 py-2">
          {typedQ}
          {!showAnswer && <span className="inline-block w-1.5 h-4 bg-white/70 ml-0.5 animate-pulse align-middle" />}
        </div>
        {showAnswer && (
          <div className="self-start max-w-[85%] bg-gray-100 dark:bg-gray-800 text-sm rounded-2xl rounded-bl-sm px-4 py-2 animate-[fadeSlideIn_0.3s_ease-out]">
            <p>{current.a}</p>
            <p className="text-xs text-gray-400 mt-1.5">📎 {current.source}</p>
          </div>
        )}
      </div>
    </div>
  );
}
