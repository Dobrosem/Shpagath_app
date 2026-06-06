import { Filter, Search } from "lucide-react";
import { TaskCard } from "@/components/cards";
import { EntityDialog } from "@/components/entity-dialog";
import { PageHeader } from "@/components/ui";
import { getTasks } from "@/lib/data";

const options = (values: string[]) => values.map((value) => ({ value, label: value.replaceAll("_", " ") }));
export default async function TasksPage() {
  const tasks = await getTasks();
  return <>
    <PageHeader eyebrow="Исполнение" title="Задачи" description="Ответственные, сроки и следующий конкретный шаг."
      action={<EntityDialog title="Задача" table="tasks" path="/tasks" fields={[
        { name: "title", label: "Название", required: true }, { name: "description", label: "Описание", type: "textarea" },
        { name: "status", label: "Статус", type: "select", required: true, options: options(["todo", "in_progress", "review", "done"]) },
        { name: "priority", label: "Приоритет", type: "select", required: true, options: options(["low", "normal", "high", "critical"]) }, { name: "due_date", label: "Срок", type: "date" },
      ]} />} />
    <div className="mb-5 flex flex-col gap-3 sm:flex-row">
      <div className="relative max-w-md flex-1"><Search className="absolute left-3 top-3 text-zinc-700" size={15} /><input className="field pl-9" placeholder="Поиск задач" /></div>
      <button className="button-secondary"><Filter size={14} />Фильтры</button>
    </div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{tasks.map((task) => <TaskCard key={task.id} task={task} />)}</div>
  </>;
}
