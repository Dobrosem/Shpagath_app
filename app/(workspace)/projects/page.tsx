import { ProjectCard } from "@/components/cards";
import { EntityDialog } from "@/components/entity-dialog";
import { PageHeader } from "@/components/ui";
import { getProfile, getProjects } from "@/lib/data";
import { translator } from "@/lib/i18n";

const projectTypes = [
  ["concert", "Концерт"], ["release", "Релиз"], ["song", "Песня"], ["video", "Видео"],
  ["merch", "Мерч"], ["rehearsal", "Репетиция"], ["promo_campaign", "Промо-кампания"],
  ["orchestration", "Оркестровка"], ["recording", "Запись"], ["mixing", "Сведение"], ["mastering", "Мастеринг"],
].map(([value, label]) => ({ value, label }));
export default async function ProjectsPage() {
  const [projects, profile] = await Promise.all([getProjects(), getProfile()]);
  const t = translator(profile.locale);
  return <>
    <PageHeader eyebrow={profile.locale === "en" ? "Management" : "Управление"} title={t("page.projects.title")} description={t("page.projects.description")}
      action={<EntityDialog title="Проект" table="projects" path="/projects" fields={[
        { name: "title", label: "Название", required: true }, { name: "type", label: "Тип", type: "select", required: true, options: projectTypes },
        { name: "description", label: "Описание", type: "textarea" }, { name: "status", label: "Статус", type: "select", defaultValue: "idea", options: [
          { value: "idea", label: "Идея" }, { value: "draft", label: "Черновик" }, { value: "in_progress", label: "В работе" },
          { value: "waiting", label: "Ожидание" }, { value: "approved", label: "Утверждено" }, { value: "done", label: "Готово" },
          { value: "archived", label: "Архив" },
        ] },
        { name: "priority", label: "Приоритет", type: "select", defaultValue: "normal", options: [
          { value: "low", label: "Низкий" }, { value: "normal", label: "Обычный" },
          { value: "high", label: "Высокий" }, { value: "critical", label: "Критический" },
        ] }, { name: "deadline", label: "Дедлайн", type: "date" },
      ]} />} />
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{projects.map((project) => <ProjectCard key={project.id} project={project} />)}{!projects.length && <div className="metal-card col-span-full p-12 text-center text-sm text-zinc-600">{profile.locale === "en" ? "No projects yet." : "Проектов пока нет."}</div>}</div>
  </>;
}
