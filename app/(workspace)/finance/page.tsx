import { Plus } from "lucide-react";
import { Metric } from "@/components/ui";
import { SectionPage } from "@/components/section-page";

export default function FinancePage() {
  return <>
    <div className="mb-6 grid grid-cols-3 gap-3"><Metric label="Доходы" value="₽ 420k" /><Metric label="Расходы" value="₽ 268k" /><Metric label="Остаток" value="₽ 152k" /></div>
    <SectionPage eyebrow="Учёт" title="Финансы" description="Простой операционный учёт по проектам и концертам."
      action={<button className="button-primary"><Plus size={15} />Добавить запись</button>}
      rows={[
        { title: "Аренда URBAN", subtitle: "expense · rent · Saphath Москва", meta: "2 июня", value: "− ₽ 120 000" },
        { title: "Предоплата билетов", subtitle: "income · tickets · Saphath Москва", meta: "5 июня", value: "+ ₽ 240 000" },
        { title: "Дизайн афиши", subtitle: "expense · design · оплачено Анной", meta: "6 июня", value: "− ₽ 18 000" },
      ]} />
  </>;
}
