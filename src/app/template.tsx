// template.tsx re-mounts on every navigation (unlike layout.tsx), so this
// gives every page a subtle fade/slide-in transition automatically.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-transition">{children}</div>;
}
