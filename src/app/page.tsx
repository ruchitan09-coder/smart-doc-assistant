import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { LandingDemo } from "@/components/landing-demo";
import { FaqAccordion } from "@/components/faq-accordion";

const FEATURES = [
  { icon: "💬", title: "Ask anything", desc: "Get answers grounded in your own documents, with sources cited." },
  { icon: "📚", title: "Multi-document chat", desc: "Compare and query across several files at once." },
  { icon: "🔎", title: "Fast search", desc: "Find the exact passage you need across your whole library." },
  { icon: "🔒", title: "Private by default", desc: "Your files and conversations are visible only to you." },
];

const STEPS = [
  { title: "Upload a document", desc: "PDF, DOCX, TXT, or images — drag and drop, done in seconds." },
  { title: "Ask a question", desc: "Type naturally, like you'd ask a colleague who read it for you." },
  { title: "Get a grounded answer", desc: "With the exact source and page cited, every time." },
];

const FAQS = [
  {
    q: "What file types are supported?",
    a: "PDF, DOCX, TXT, and image files (PNG/JPG) are accepted for upload.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Every document and conversation is tied to your account, and access is enforced at both the application and database level.",
  },
  {
    q: "Does the AI make things up?",
    a: "The assistant only answers from content retrieved from your documents, and says so clearly when it can't find something rather than guessing.",
  },
  {
    q: "Can I ask questions across multiple documents at once?",
    a: "Yes — open any document and select additional ones to include in the same conversation for side-by-side comparisons.",
  },
];

export default async function LandingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="overflow-hidden">
      <Navbar userEmail={user?.email} />

      {/* Hero: the demo itself is the opening statement, not a headline
          followed by a separate proof section below the fold. */}
      <section className="relative ruled-paper">
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-[1fr_1.05fr] gap-14 items-center">
          <div>
            <h1 className="hero-rise font-display text-[2.75rem] leading-[1.08] font-medium tracking-tight">
              Understand your documents. Ask anything.
            </h1>
            <p
              className="hero-rise mt-5 text-lg text-gray-600 dark:text-gray-400 max-w-md"
              style={{ animationDelay: "90ms" }}
            >
              Upload your documents and let AI summarize, analyze, search, and
              answer questions with answers grounded in your files — every
              claim traced back to a page you can open.
            </p>
            <div className="hero-rise mt-8 flex gap-3" style={{ animationDelay: "160ms" }}>
              <Link href="/sign-up">
                <Button className="px-6 py-3 text-base">Get Started</Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="secondary" className="px-6 py-3 text-base">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>

          <div className="hero-rise" style={{ animationDelay: "120ms" }}>
            <LandingDemo />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-16 grid sm:grid-cols-2 gap-4">
        {FEATURES.map((f) => (
          <Card key={f.title} interactive className="p-6">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-brand-50 dark:bg-brand-500/15 text-lg mb-3">
              {f.icon}
            </span>
            <h3 className="font-medium mb-1">{f.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{f.desc}</p>
          </Card>
        ))}
      </section>

      {/* How it works — a genuine sequence, so numbering earns its place here. */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="font-display text-2xl font-medium mb-10">How it works</h2>
        <ol className="space-y-6">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-5 pb-6 border-b border-gray-200 dark:border-gray-800 last:border-0 last:pb-0">
              <span className="font-mono text-sm text-brand-500 pt-0.5 w-6 shrink-0">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="font-medium">{step.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Security */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <Card className="p-8">
          <h2 className="font-display text-xl font-medium mb-2">Security & privacy</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
            Your documents are stored securely and are never publicly accessible.
            Every request is authenticated, and you can only ever access your own
            documents and conversations.
          </p>
        </Card>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="font-display text-2xl font-medium mb-8">Frequently asked questions</h2>
        <FaqAccordion items={FAQS} />
      </section>

      <footer className="border-t border-gray-200 dark:border-gray-800 py-8 text-center text-sm text-gray-500">
        Smart Document Assistant — built as a portfolio project.
      </footer>
    </div>
  );
}
