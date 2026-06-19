import { EventCard } from "@/components/cards";
import { EntityDialog } from "@/components/entity-dialog";
import { PageHeader } from "@/components/ui";
import { getEventsList, getProfile } from "@/lib/data";
import { translator } from "@/lib/i18n";
import { canDeleteOperationalData } from "@/lib/roles";

export default async function EventsPage({ searchParams }: { searchParams?: Promise<{ create?: string }> }) {
  const params = await searchParams;
  const [events, profile] = await Promise.all([getEventsList(), getProfile()]);
  const t = translator(profile.locale);
  const canCreate = canDeleteOperationalData(profile.role);
  return <>
    <PageHeader eyebrow={profile.locale === "en" ? "Live" : "Концерты"} title={t("page.events.title")} description={t("page.events.description")}
      action={canCreate ? <EntityDialog title="Концерт" table="events" path="/events" fields={[
        { name: "title", label: "Название", required: true }, { name: "city", label: "Город", required: true }, { name: "venue", label: "Площадка" },
        { name: "starts_at", label: "Дата и время", type: "datetime-local", required: true }, { name: "status", label: "Статус", type: "select", defaultValue: "planned", options: [
          { value: "planned", label: "Запланирован" }, { value: "announced", label: "Анонсирован" }, { value: "in_progress", label: "В работе" },
          { value: "done", label: "Завершён" }, { value: "cancelled", label: "Отменён" }, { value: "archived", label: "Архив" },
        ] },
        { name: "ticket_url", label: "Билеты", type: "url" }, { name: "vk_event_url", label: "Событие VK", type: "url" }, { name: "description", label: "Описание", type: "textarea" },
      ]} initiallyOpen={params?.create === "1"} /> : undefined} />
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{events.map((event) => <EventCard key={event.id} event={event} />)}{!events.length && <div className="metal-card col-span-full p-12 text-center text-sm text-zinc-600">{profile.locale === "en" ? "No events yet." : "Концертов пока нет."}</div>}</div>
  </>;
}
