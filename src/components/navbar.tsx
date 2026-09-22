"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { Logo } from "./logo";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/documents", label: "Documents" },
  { href: "/conversations", label: "Conversations" },
  { href: "/search", label: "Search" },
  { href: "/custom-model", label: "Custom Model" },
  { href: "/settings", label: "Settings" },
];

export function Navbar({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();
  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "?";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`flex items-center justify-between px-6 py-3 border-b bg-white/80 dark:bg-ink/80 backdrop-blur sticky top-0 z-10 transition-shadow ${
        scrolled ? "border-gray-200 dark:border-gray-800 shadow-sm" : "border-transparent"
      }`}
    >
      <Link href={userEmail ? "/dashboard" : "/"} className="flex items-center gap-2.5 font-semibold text-[15px]">
        <Logo className="w-7 h-7 shrink-0" />
        <span className="font-display font-medium">Smart Document Assistant</span>
      </Link>
      <div className="flex items-center gap-1 text-sm">
        {userEmail ? (
          <>
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-full transition-colors ${
                  pathname.startsWith(link.href)
                    ? "bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-200 font-medium"
                    : "hover:bg-paper-dim dark:hover:bg-gray-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="mx-2"><ThemeToggle /></div>
            <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            <form action="/api/auth/sign-out" method="post">
              <button className="ml-2 px-3 py-1.5 rounded-full hover:bg-paper-dim dark:hover:bg-gray-900">
                Log out
              </button>
            </form>
          </>
        ) : (
          <>
            <ThemeToggle />
            <Link href="/sign-in" className="px-3 py-1.5 rounded-full hover:bg-paper-dim dark:hover:bg-gray-900">
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-brand-500 text-white px-4 py-1.5 hover:bg-brand-600 ml-1"
            >
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
