import { PageHeader, StatusBadge } from "./ui";

export interface Row {
  title: string;
  subtitle: string;
  status?: string;
  meta?: string;
  value?: string;
}

export function SectionPage({ eyebrow, title, description, rows, action }: { eyebrow: string; title: string; description: string; rows: Row[]; action?: React.ReactNode }) {
  return <>
    <PageHeader eyebrow={eyebrow} title={title} description={description} action={action} />
    <div className="table-shell">
      {rows.map((row) => <article key={row.title} className="flex flex-col gap-3 border-b border-white/[.055] p-5 last:border-0 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1"><h2 className="text-sm font-medium text-zinc-200">{row.title}</h2><p className="mt-1 text-xs text-zinc-600">{row.subtitle}</p></div>
        {row.meta && <span className="text-xs text-zinc-500">{row.meta}</span>}
        {row.value && <span className="font-display text-lg text-zinc-200">{row.value}</span>}
        {row.status && <StatusBadge status={row.status} />}
      </article>)}
    </div>
  </>;
}
