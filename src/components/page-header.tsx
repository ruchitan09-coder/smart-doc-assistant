export function PageHeader({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
}) {
  return (
    <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-800">
      <h1 className="font-display text-3xl font-medium tracking-tight flex items-center gap-2.5">
        {icon && <span className="text-2xl" aria-hidden>{icon}</span>} {title}
      </h1>
      {subtitle && (
        <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">{subtitle}</p>
      )}
    </div>
  );
}
