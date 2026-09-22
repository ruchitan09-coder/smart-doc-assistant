import { clsx } from "clsx";
import { HTMLAttributes } from "react";

// Crisp, minimal-radius edges -- reads as a sheet of paper/content
// container, deliberately distinct from the fully-rounded pill Buttons use
// for actions. Pass `interactive` for the restrained hover treatment
// (border/shadow shift only -- see .interactive-card in globals.css).
export function Card({
  className,
  interactive,
  ...props
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-ink shadow-sm",
        interactive && "interactive-card",
        className
      )}
      {...props}
    />
  );
}
