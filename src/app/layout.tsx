import type { Metadata } from "next";
import { Fraunces, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

// Fraunces carries the editorial, document-literate personality of the
// product and is reserved for headlines/page titles. Public Sans is the
// workhorse UI/body face. Plex Mono is used sparingly, only where the
// content is genuinely numeric/versioned data (confidence scores, model
// versions) — a small "precision instrument" signature, not a decorative
// label font.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600"],
  style: ["normal", "italic"],
});
const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Smart Document Assistant",
  description: "Understand your documents. Ask anything.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${publicSans.variable} ${plexMono.variable}`}
    >
      <body className="min-h-screen antialiased font-sans bg-paper dark:bg-ink text-ink dark:text-paper">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
