import { EntityDialog } from "@/components/entity-dialog";
import { SongsCatalog } from "@/components/songs-catalog";
import { PageHeader } from "@/components/ui";
import { getAlbums, getProfile, getSongs } from "@/lib/data";
import { translator } from "@/lib/i18n";

const statusOptions = [
  ["idea", "Идея"], ["demo", "Демо"], ["arrangement", "Аранжировка"],
  ["recording", "Запись"], ["mixing", "Сведение"], ["mastering", "Мастеринг"],
  ["ready", "Готово"], ["live_ready", "Готово к концерту"], ["archived", "Архив"],
].map(([value, label]) => ({ value, label }));

export default async function SongsPage() {
  const [songs, albums, profile] = await Promise.all([getSongs(), getAlbums(), getProfile()]);
  const t = translator(profile.locale);
  return <>
    <PageHeader eyebrow={profile.locale === "en" ? "Repertoire" : "Репертуар"} title={t("page.songs.title")} description={t("page.songs.description")}
      action={<EntityDialog title="Песня" table="songs" path="/songs" detailPath="/songs" fields={[
        { name: "title", label: "Название", required: true }, { name: "subtitle", label: "Подзаголовок" },
        { name: "status", label: "Статус", type: "select", defaultValue: "idea", options: statusOptions },
        { name: "bpm", label: "BPM", type: "number" }, { name: "key", label: "Тональность" }, { name: "tuning", label: "Строй" },
        { name: "time_signature", label: "Размер" },
        { name: "duration_minutes", label: profile.locale === "en" ? "Duration, minutes" : "Длительность, минуты", type: "number", min: 0 },
        { name: "duration_seconds", label: profile.locale === "en" ? "Duration, seconds" : "Длительность, секунды", type: "number", min: 0, max: 59 },
        { name: "arrangement_version", label: "Версия аранжировки" },
        { name: "description", label: "Описание", type: "textarea" },
        { name: "lyrics", label: "Текст песни", type: "textarea" },
        { name: "live_version_notes", label: "Заметки к концертной версии", type: "textarea" },
      ]} />} />
    <SongsCatalog songs={songs} albums={albums} />
  </>;
}
