import Link from "next/link";
import { ArrowLeft, ExternalLink, MapPin, ShieldAlert } from "lucide-react";
import { TaskCard } from "@/components/cards";
import { PageHeader, StatusBadge } from "@/components/ui";
import { events, tasks } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let event = events.find((item) => item.id === id) ?? events[0];
  const supabase = await createClient();
  if (supabase) {
    const { data } = await supabase.from("events").select("*").eq("id", id).single();
    if (data) event = data;
  }
  return <>
    <Link href="/events" className="mb-5 inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-white"><ArrowLeft size={14} />К концертам</Link>
    <PageHeader eyebrow="Концерт" title={event.title} description={`${event.city} · ${event.venue ?? "Площадка уточняется"}`}
      action={<Link href={`/events/${id}/battle-sheet`} className="button-primary"><ShieldAlert size={15} />Боевой лист</Link>} />
    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <div className="space-y-5">
        <div className="metal-card p-6"><div className="flex items-center justify-between"><StatusBadge status={event.status} context="event" /><span className="text-sm text-zinc-400">{formatDate(event.starts_at, true)}</span></div><p className="mt-8 flex items-center gap-2 text-sm text-zinc-300"><MapPin size={15} className="text-zinc-600" />{event.city}, {event.venue}</p><div className="mt-6 grid grid-cols-3 gap-2">{[["Сбор", event.call_time], ["Саундчек", event.soundcheck_time], ["Выход", event.performance_time]].map(([label, value]) => <div key={label} className="rounded-lg bg-white/[.025] p-3"><p className="text-[9px] uppercase text-zinc-700">{label}</p><p className="mt-2 text-lg text-zinc-200">{value ?? "—"}</p></div>)}</div></div>
        <div className="metal-card p-6"><h2 className="font-display text-lg uppercase text-white">Технические ссылки</h2>{["Технический райдер", "Stage plot", "Световой тайминг", "Видео / интро"].map((item) => <a href="#" key={item} className="flex items-center justify-between border-b border-white/[.06] py-3 text-xs text-zinc-400 last:border-0 hover:text-white">{item}<ExternalLink size={13} /></a>)}</div>
      </div>
      <div><h2 className="mb-3 font-display text-lg uppercase text-white">Подготовка</h2><div className="grid gap-3 md:grid-cols-2">{tasks.slice(1, 5).map((task) => <TaskCard key={task.id} task={task} />)}</div><div className="mt-5 metal-card p-6"><h2 className="font-display text-lg uppercase text-white">Сетлист</h2><ol className="mt-4 divide-y divide-white/[.06]">{["Through the Ashes", "Ritual", "Cold Horizon", "The Last Light"].map((song, index) => <li key={song} className="flex items-center gap-4 py-3"><span className="w-6 text-xs text-zinc-700">{String(index + 1).padStart(2, "0")}</span><span className="text-sm text-zinc-300">{song}</span><span className="ml-auto text-[10px] text-zinc-700">LIVE v{index + 2}.0</span></li>)}</ol></div></div>
    </div>
  </>;
}
