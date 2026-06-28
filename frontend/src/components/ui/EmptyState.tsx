import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  actions,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-white px-6 py-12 text-center ring-1 ring-zinc-200">
      {icon ? (
        <div className="mb-4 text-4xl text-zinc-300">{icon}</div>
      ) : null}
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-zinc-600">{description}</p>
      {actions ? <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div> : null}
    </div>
  );
}
