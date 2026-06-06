import { Filter, Search } from "lucide-react";
import { SongCard } from "@/components/cards";
import { EntityDialog } from "@/components/entity-dialog";
import { PageHeader } from "@/components/ui";
import { getSongs } from "@/lib/data";

const options = (values: string[]) => values.map((value) => ({ value, label: value.replaceAll("_", " ") }));
export default async function SongsPage() {
  const songs = await getSongs();
  return <>
    <PageHeader eyebrow="Репертуар" title="Песни" description="Единая база версий, партий, нот и концертных материалов."
      action={<EntityDialog title="Песня" table="songs" path="/songs" fields={[
        { name: "title", label: "Название", required: true }, { name: "subtitle", label: "Подзаголовок" },
        { name: "status", label: "Статус", type: "select", required: true, options: options(["idea", "demo", "arrangement", "recording", "mixing", "mastering", "ready", "live_ready"]) },
        { name: "bpm", label: "BPM", type: "number" }, { name: "key", label: "Тональность" }, { name: "tuning", label: "Строй" },
        { name: "time_signature", label: "Размер" }, { name: "arrangement_version", label: "Версия" },
      ]} />} />
    <div className="mb-5 flex gap-3"><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-3 text-zinc-700" size={15} /><input className="field pl-9" placeholder="Найти песню" /></div><button className="button-secondary"><Filter size={14} />Статус</button></div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{songs.map((song) => <SongCard key={song.id} song={song} />)}</div>
  </>;
}
