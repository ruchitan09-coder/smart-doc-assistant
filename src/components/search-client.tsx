"use client";
import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Result {
  documentId: string;
  fileName: string;
  pageNumber: number | null;
  excerpt: string;
  relevance: string;
}

export function SearchClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setResults(data.results ?? []);
    setLoading(false);
  }

  return (
    <>
      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <Input
          placeholder='e.g. "Find documents mentioning payment terms"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" disabled={loading}>{loading ? "Searching..." : "Search"}</Button>
      </form>

      <div className="space-y-3">
        {results.map((r, i) => (
          <Link key={i} href={`/documents/${r.documentId}`}>
            <Card className="p-4 hover:border-brand-500 hover:shadow-sm transition-all">
              <div className="flex justify-between items-start">
                <p className="font-medium">{r.fileName}</p>
                <span className="text-xs text-gray-400">relevance {r.relevance}</span>
              </div>
              {r.pageNumber && <p className="text-xs text-gray-500">Page {r.pageNumber}</p>}
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{r.excerpt}...</p>
            </Card>
          </Link>
        ))}
        {searched && !loading && results.length === 0 && (
          <p className="text-sm text-gray-500">No matching content found.</p>
        )}
      </div>
    </>
  );
}
