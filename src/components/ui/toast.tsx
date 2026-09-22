"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { clsx } from "clsx";

interface Toast {
  id: number;
  message: string;
  tone: "default" | "success" | "error";
}

interface ToastContextValue {
  showToast: (message: string, tone?: Toast["tone"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let idCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, tone: Toast["tone"] = "default") => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={clsx(
              "rounded-lg border px-4 py-3 text-sm shadow-lg animate-[fadeSlideIn_0.2s_ease-out] bg-white dark:bg-ink",
              t.tone === "success" && "border-green-200 dark:border-green-900 text-green-800 dark:text-green-300",
              t.tone === "error" && "border-red-200 dark:border-red-900 text-red-800 dark:text-red-300",
              t.tone === "default" && "border-gray-200 dark:border-gray-700 text-ink dark:text-paper"
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fail soft rather than crash the page if a component renders outside
    // the provider (shouldn't happen since RootLayout always wraps it).
    return { showToast: () => {} };
  }
  return ctx;
}
