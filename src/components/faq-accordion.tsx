"use client";
import { useState } from "react";
import { Card } from "./ui/card";

interface FAQ {
  q: string;
  a: string;
}

export function FaqAccordion({ items }: { items: FAQ[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <Card key={item.q} className="overflow-hidden">
            <button
              onClick={() => setOpenIndex(open ? null : i)}
              className="w-full flex items-center justify-between text-left p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <span className="font-medium">{item.q}</span>
              <span
                className={`text-brand-500 text-lg transition-transform duration-200 ${
                  open ? "rotate-45" : ""
                }`}
              >
                +
              </span>
            </button>
            <div
              className={`grid transition-all duration-300 ease-out ${
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-sm text-gray-600 dark:text-gray-400">{item.a}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
