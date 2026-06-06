import { Plus } from "lucide-react";
import { SectionPage } from "@/components/section-page";

export default function RehearsalsPage() {
  return <SectionPage eyebrow="Практика" title="Репетиции" description="Цели, проблемные места, решения и задачи после каждого прогона."
    action={<button className="button-primary"><Plus size={15} />Запланировать</button>}
    rows={[
      { title: "Полный концертный прогон", subtitle: "Through the Ashes · Ritual · Cold Horizon · The Last Light", meta: "12 июня · Base Studio", status: "planned" },
      { title: "Секции: ритм + оркестровки", subtitle: "Переход в Cold Horizon, финал The Last Light", meta: "19 июня · Base Studio", status: "planned" },
      { title: "Вокал и концертные команды", subtitle: "Зафиксированы новые cues для интро и финала", meta: "3 июня · Loft 42", status: "done" },
    ]} />;
}
