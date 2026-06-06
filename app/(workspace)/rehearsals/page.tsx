import { EntityDialog } from "@/components/entity-dialog";
import { SectionPage } from "@/components/section-page";
import { getRehearsals } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function RehearsalsPage() {
  const rehearsals = await getRehearsals();
  return <SectionPage eyebrow="Практика" title="Репетиции" description="Цели, проблемные места, решения и задачи после каждого прогона."
    action={<EntityDialog title="Репетиция" table="rehearsals" path="/rehearsals" fields={[
      { name: "title", label: "Название", required: true },
      { name: "starts_at", label: "Дата и время", type: "datetime-local", required: true },
      { name: "location", label: "Место" },
      { name: "goals", label: "Цели", type: "textarea" },
      { name: "notes", label: "Заметки", type: "textarea" },
      { name: "problems", label: "Проблемы", type: "textarea" },
      { name: "decisions", label: "Решения", type: "textarea" },
      { name: "next_tasks", label: "Следующие задачи", type: "textarea" },
    ]} />}
    rows={rehearsals.map((rehearsal) => ({
      title: rehearsal.title,
      subtitle: rehearsal.goals || "Цели пока не указаны",
      meta: `${formatDate(rehearsal.starts_at, true)} · ${rehearsal.location || "место не указано"}`,
      status: "planned",
    }))} />;
}
