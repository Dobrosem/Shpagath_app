import { EntityDialog } from "@/components/entity-dialog";
import { Metric } from "@/components/ui";
import { SectionPage } from "@/components/section-page";
import { getFinanceRecords } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function FinancePage() {
  const records = await getFinanceRecords();
  const income = records.filter((record) => record.type === "income").reduce((sum, record) => sum + Number(record.amount), 0);
  const expense = records.filter((record) => record.type === "expense").reduce((sum, record) => sum + Number(record.amount), 0);
  const money = (value: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);
  return <>
    <div className="mb-6 grid grid-cols-3 gap-3"><Metric label="Доходы" value={money(income)} /><Metric label="Расходы" value={money(expense)} /><Metric label="Остаток" value={money(income - expense)} /></div>
    <SectionPage eyebrow="Учёт" title="Финансы" description="Простой операционный учёт по проектам и концертам."
      action={<EntityDialog title="Финансовая запись" table="finance_records" path="/finance" fields={[
        { name: "title", label: "Название", required: true },
        { name: "type", label: "Тип", type: "select", required: true, options: [{ value: "income", label: "Доход" }, { value: "expense", label: "Расход" }] },
        { name: "category", label: "Категория", required: true },
        { name: "amount", label: "Сумма", type: "number", required: true },
        { name: "currency", label: "Валюта", defaultValue: "RUB" },
        { name: "date", label: "Дата", type: "date", required: true },
        { name: "notes", label: "Заметки", type: "textarea" },
      ]} />}
      rows={records.map((record) => ({
        title: record.title,
        subtitle: `${record.type === "income" ? "доход" : "расход"} · ${record.category}`,
        meta: formatDate(record.date),
        value: `${record.type === "income" ? "+" : "−"} ${money(Number(record.amount))}`,
      }))} />
  </>;
}
