// A minimal monogram standing in for a highlighted line of text on a page --
// the product's core motif (marking the exact passage that answers a
// question), reduced to a mark. Deliberately not a generic document/robot
// icon.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="1" y="1" width="26" height="26" rx="6" className="fill-brand-500" />
      <rect x="7" y="9" width="14" height="2.4" rx="1.2" fill="white" fillOpacity="0.55" />
      <rect x="7" y="14" width="14" height="2.4" rx="1.2" className="fill-gold-400" />
      <rect x="7" y="19" width="9" height="2.4" rx="1.2" fill="white" fillOpacity="0.55" />
    </svg>
  );
}
