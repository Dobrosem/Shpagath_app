import { Filter, Search } from "lucide-react";
import { SongCard } from "@/components/cards";
import { EntityDialog } from "@/components/entity-dialog";
import { PageHeader } from "@/components/ui";
import { getProfile, getSongs } from "@/lib/data";
import { translator } from "@/lib/i18n";

const statusOptions = [
  ["idea", "Идея"], ["demo", "Демо"], ["arrangement", "Аранжировка"],
  ["recording", "Запись"], ["mixing", "Сведение"], ["mastering", "Мастеринг"],
  ["ready", "Готово"], ["live_ready", "Готово к концерту"], ["archived", "Архив"],
].map(([value, label]) => ({ value, label }));

export default async function SongsPage() {
  const [songs, profile] = await Promise.all([getSongs(), getProfile()]);
  const t = translator(profile.locale);
  return <>
    <PageHeader eyebrow={profile.locale === "en" ? "Repertoire" : "Репертуар"} title={t("page.songs.title")} description={t("page.songs.description")}
      action={<EntityDialog title="Песня" table="songs" path="/songs" detailPath="/songs" fields={[
        { name: "title", label: "Название", required: true }, { name: "subtitle", label: "Подзаголовок" },
        { name: "status", label: "Статус", type: "select", defaultValue: "idea", options: statusOptions },
        { name: "bpm", label: "BPM", type: "number" }, { name: "key", label: "Тональность" }, { name: "tuning", label: "Строй" },
        { name: "time_signature", label: "Размер" }, { name: "duration", label: "Длительность, секунд", type: "number" },
        { name: "arrangement_version", label: "Версия аранжировки" },
        { name: "description", label: "Описание", type: "textarea" },
        { name: "lyrics", label: "Текст песни", type: "textarea" },
        { name: "live_version_notes", label: "Заметки к концертной версии", type: "textarea" },
      ]} />} />
    <div className="mb-5 flex gap-3"><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-3 text-zinc-700" size={15} /><input className="field pl-9" placeholder={profile.locale === "en" ? "Find a song" : "Найти песню"} /></div><button className="button-secondary"><Filter size={14} />{profile.locale === "en" ? "Status" : "Статус"}</button></div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {songs.map((song) => <SongCard key={song.id} song={song} />)}
      {!songs.length && <div className="metal-card col-span-full p-12 text-center text-sm text-zinc-600">{profile.locale === "en" ? "No songs yet. Create the first song." : "Песен пока нет. Создайте первую песню."}</div>}
    </div>
  </>;
}
