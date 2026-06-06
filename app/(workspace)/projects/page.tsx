import { Filter } from "lucide-react";
import { ProjectCard } from "@/components/cards";
import { EntityDialog } from "@/components/entity-dialog";
import { PageHeader } from "@/components/ui";
import { getProjects } from "@/lib/data";

const options = (values: string[]) => values.map((value) => ({ value, label: value.replaceAll("_", " ") }));
export default async function ProjectsPage() {
  const projects = await getProjects();
  return <>
    <PageHeader eyebrow="Управление" title="Проекты" description="Все инициативы группы: релизы, концерты, видео, запись и промо."
      action={<EntityDialog title="Проект" table="projects" path="/projects" fields={[
        { name: "title", label: "Название", required: true }, { name: "type", label: "Тип", type: "select", required: true, options: options(["concert", "release", "song", "video", "merch", "rehearsal", "promo_campaign", "orchestration", "recording", "mixing", "mastering"]) },
        { name: "description", label: "Описание", type: "textarea" }, { name: "status", label: "Статус", type: "select", required: true, options: options(["idea", "draft", "in_progress", "waiting", "approved", "done"]) },
        { name: "priority", label: "Приоритет", type: "select", required: true, options: options(["low", "normal", "high", "critical"]) }, { name: "deadline", label: "Дедлайн", type: "date" },
      ]} />} />
    <div className="mb-5 flex flex-wrap gap-2"><button className="button-secondary"><Filter size={14} />Все типы</button>{["В работе", "Ожидают", "Критические"].map((item) => <button key={item} className="button-secondary">{item}</button>)}</div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{projects.map((project) => <ProjectCard key={project.id} project={project} />)}</div>
  </>;
}
