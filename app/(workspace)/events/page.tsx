import { EventCard } from "@/components/cards";
import { EntityDialog } from "@/components/entity-dialog";
import { PageHeader } from "@/components/ui";
import { getEvents } from "@/lib/data";

const options = (values: string[]) => values.map((value) => ({ value, label: value }));
export default async function EventsPage() {
  const events = await getEvents();
  return <>
    <PageHeader eyebrow="Live" title="Концерты" description="Подготовка, логистика, техника и боевые листы."
      action={<EntityDialog title="Концерт" table="events" path="/events" fields={[
        { name: "title", label: "Название", required: true }, { name: "city", label: "Город", required: true }, { name: "venue", label: "Площадка" },
        { name: "starts_at", label: "Дата и время", type: "datetime-local", required: true }, { name: "status", label: "Статус", type: "select", required: true, options: options(["planned", "announced", "in_progress"]) },
        { name: "ticket_url", label: "Билеты", type: "url" }, { name: "vk_event_url", label: "Событие VK", type: "url" }, { name: "description", label: "Описание", type: "textarea" },
      ]} />} />
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{events.map((event) => <EventCard key={event.id} event={event} />)}</div>
  </>;
}
