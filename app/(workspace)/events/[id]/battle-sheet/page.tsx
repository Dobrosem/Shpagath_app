import Link from "next/link";
import { ArrowLeft, Clock3, ExternalLink, MapPin, Phone, ShieldAlert } from "lucide-react";
import { events } from "@/lib/demo-data";
import { StatusBadge } from "@/components/ui";

export default async function BattleSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = events.find((item) => item.id === id) ?? events[0];
  return <div className="mx-auto max-w-5xl">
    <Link href={`/events/${id}`} className="mb-5 inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-white"><ArrowLeft size={14} />Карточка концерта</Link>
    <header className="mb-7 border-b border-white/10 pb-7"><p className="eyebrow flex items-center gap-2"><ShieldAlert size={13} />Боевой лист</p><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="font-display text-4xl uppercase text-white sm:text-5xl">{event.title}</h1><p className="mt-3 flex items-center gap-2 text-sm text-zinc-500"><MapPin size={14} />{event.city} · {event.venue}</p></div><StatusBadge status={event.status} context="event" /></div></header>
    <section className="grid grid-cols-3 gap-3">{[["Сбор", event.call_time ?? "15:00"], ["Саундчек", event.soundcheck_time ?? "17:00"], ["Выход", event.performance_time ?? "20:30"]].map(([label, time]) => <div className="metal-card p-4 text-center sm:p-6" key={label}><Clock3 className="mx-auto text-ember" size={18} /><p className="mt-3 text-[9px] uppercase tracking-widest text-zinc-600">{label}</p><p className="mt-1 font-display text-2xl text-white sm:text-4xl">{time}</p></div>)}</section>
    <section className="mt-5 grid gap-5 md:grid-cols-2">
      <div className="metal-card p-6"><h2 className="font-display text-xl uppercase text-white">Сетлист</h2><ol className="mt-4">{["Through the Ashes", "Ritual", "Cold Horizon", "The Last Light", "Encore: Black Sun"].map((song, index) => <li className="flex border-b border-white/[.06] py-3 last:border-0" key={song}><span className="w-8 text-xs text-ember">{String(index + 1).padStart(2, "0")}</span><span className="text-sm text-zinc-200">{song}</span></li>)}</ol></div>
      <div className="space-y-5"><div className="metal-card p-6"><h2 className="font-display text-xl uppercase text-white">Критические ссылки</h2>{["Плейбеки + клик", "Технический райдер", "Stage plot", "Свет / видео"].map((link) => <a href="#" className="flex items-center justify-between border-b border-white/[.06] py-3 text-sm text-zinc-300 last:border-0" key={link}>{link}<ExternalLink size={14} className="text-zinc-600" /></a>)}</div><div className="metal-card border-ember/20 p-6"><h2 className="font-display text-xl uppercase text-white">Не забыть</h2><ul className="mt-4 space-y-3 text-sm text-zinc-400">{["Резервный ноутбук и блок питания", "In-ear pack: 4 комплекта", "Мерч и терминал", "USB с резервным плейбеком"].map((item) => <li key={item}>□ {item}</li>)}</ul></div></div>
    </section>
    <section className="mt-5 metal-card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[9px] uppercase tracking-widest text-zinc-600">Контакт площадки</p><p className="mt-2 text-sm text-zinc-200">Андрей · технический директор</p></div><a href="tel:+79990000000" className="button-primary"><Phone size={14} />+7 999 000-00-00</a></section>
  </div>;
}
