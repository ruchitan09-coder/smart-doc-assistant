"use client";
import { useEffect, useState } from "react";

const DEMO_PROMPTS = [
  {
    question: "Summarize this contract in 3 bullet points",
    answer:
      "• Payment is due within 30 days of invoice\n• Either party may terminate with 60 days notice\n• Confidentiality terms survive for 2 years after termination",
    source: "vendor_contract.pdf — Page 4",
  },
  {
    question: "What are the key findings in this research paper?",
    answer:
      "The study found a 32% improvement in user engagement after the redesign, with the strongest effect among users aged 25-34.",
    source: "user_research_2026.pdf — Page 7",
  },
  {
    question: "What's the total budget across these reports?",
    answer:
      "Combining Q1 and Q2 reports, total allocated budget is $124,500, with 68% already spent as of the latest report.",
    source: "q1_report.pdf, q2_report.pdf",
  },
];

export function LandingDemo() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [displayedAnswer, setDisplayedAnswer] = useState("");
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    setDisplayedAnswer("");
    setTyping(true);
    const fullAnswer = DEMO_PROMPTS[activeIndex].answer;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayedAnswer(fullAnswer.slice(0, i));
      if (i >= fullAnswer.length) {
        clearInterval(interval);
        setTyping(false);
      }
    }, 15);
    return () => clearInterval(interval);
  }, [activeIndex]);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-ink shadow-xl overflow-hidden max-w-2xl mx-auto">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <span className="text-xs text-gray-500 ml-2">Live demo — try a question</span>
      </div>

      <div className="p-5 min-h-[180px]">
        <div className="text-right mb-3">
          <span className="inline-block bg-brand-500 text-white text-sm rounded-2xl px-4 py-2">
            {DEMO_PROMPTS[activeIndex].question}
          </span>
        </div>
        <div className="text-left">
          <div className="inline-block bg-gray-100 dark:bg-gray-800 text-sm rounded-2xl px-4 py-2 whitespace-pre-line">
            {displayedAnswer}
            {typing && <span className="animate-pulse">▋</span>}
          </div>
          {!typing && (
            <p className="text-xs text-gray-400 mt-1.5">
              Source: <span className="highlight-mark text-gray-700 dark:text-gray-200">{DEMO_PROMPTS[activeIndex].source}</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2 px-5 pb-5 flex-wrap">
        {DEMO_PROMPTS.map((p, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${
              i === activeIndex
                ? "bg-brand-500 text-white border-brand-500"
                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            Try example {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
