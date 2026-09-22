import { clsx } from "clsx";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

// Buttons are always fully rounded (pill) -- a deliberate, consistent signal
// that this element is an action, distinct from the crisp-edged Card used
// for content. See Card for the other half of that pairing.
const variants: Record<Variant, string> = {
  primary: "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700",
  secondary:
    "bg-white dark:bg-ink text-ink dark:text-paper border border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-paper dark:hover:bg-gray-900",
  ghost: "bg-transparent hover:bg-paper-dim dark:hover:bg-gray-900",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
