import { PageHeader } from "@/components/ui";
import { people } from "@/lib/demo-data";
import { initials } from "@/lib/utils";

export default function SettingsPage() {
  return <>
    <PageHeader eyebrow="Система" title="Настройки" description="Участники, роли и параметры закрытого пространства." action={<button className="button-primary">Пригласить</button>} />
    <section className="metal-card p-6"><h2 className="font-display text-lg uppercase text-white">Команда</h2><div className="mt-4 divide-y divide-white/[.06]">{people.map((person) => <div key={person.id} className="flex items-center gap-3 py-4"><span className="grid h-9 w-9 place-items-center rounded-full bg-zinc-800 text-[10px]">{initials(person.full_name)}</span><div><p className="text-sm text-zinc-200">{person.full_name}</p><p className="mt-1 text-[10px] text-zinc-600">{person.email}</p></div><span className="badge ml-auto border-white/10 bg-white/[.03] text-zinc-400">{person.role}</span></div>)}</div></section>
  </>;
}
