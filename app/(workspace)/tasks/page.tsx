import { TaskCard } from "@/components/cards";
import { EntityDialog } from "@/components/entity-dialog";
import { PageHeader } from "@/components/ui";
import { getProfile, getProfiles, getProjects, getTasks } from "@/lib/data";
import { translator } from "@/lib/i18n";

export default async function TasksPage() {
  const [tasks, projects, profiles, profile] = await Promise.all([
    getTasks(),
    getProjects(),
    getProfiles(),
    getProfile(),
  ]);
  const t = translator(profile.locale);
  return <>
    <PageHeader eyebrow={profile.locale === "en" ? "Execution" : "Исполнение"} title={t("page.tasks.title")} description={t("page.tasks.description")}
      action={<EntityDialog title="Задача" table="tasks" path="/tasks" fields={[
        { name: "title", label: "Название", required: true }, { name: "description", label: "Описание", type: "textarea" },
        { name: "project_id", label: "Проект", type: "select", options: projects.map((project) => ({ value: project.id, label: project.title })) },
        { name: "assignee_id", label: "Ответственный", type: "select", options: profiles.map((profile) => ({ value: profile.id, label: profile.full_name })) },
        { name: "status", label: "Статус", type: "select", defaultValue: "todo", options: [
          { value: "todo", label: "К выполнению" }, { value: "in_progress", label: "В работе" },
          { value: "review", label: "На проверке" }, { value: "done", label: "Готово" },
          { value: "cancelled", label: "Отменено" },
        ] },
        { name: "priority", label: "Приоритет", type: "select", defaultValue: "normal", options: [
          { value: "low", label: "Низкий" }, { value: "normal", label: "Обычный" },
          { value: "high", label: "Высокий" }, { value: "critical", label: "Критический" },
        ] }, { name: "due_date", label: "Срок", type: "date" },
      ]} />} />
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {tasks.map((task) => <TaskCard key={task.id} task={task} />)}
      {!tasks.length && <div className="metal-card col-span-full p-12 text-center text-sm text-zinc-600">{profile.locale === "en" ? "No tasks yet. Create the first task." : "Задач пока нет. Создайте первую задачу."}</div>}
    </div>
  </>;
}
