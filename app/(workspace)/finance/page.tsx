import { EntityDialog } from "@/components/entity-dialog";
import { Metric, PageHeader } from "@/components/ui";
import { SectionPage } from "@/components/section-page";
import { getFinanceRecords, getProfile } from "@/lib/data";
import { translator } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { translateEnum } from "@/lib/i18n";
import { canManageFinance } from "@/lib/roles";

export default async function FinancePage() {
  const profile = await getProfile();
  const t = translator(profile.locale);
  if (!canManageFinance(profile.role)) {
    return <>
      <PageHeader eyebrow={profile.locale === "en" ? "Accounting" : "Учёт"} title={t("page.finance.title")} description={t("finance.adminOnly")} />
      <section className="metal-card p-6 text-sm text-zinc-500">{t("finance.adminOnly")}</section>
    </>;
  }
  const records = await getFinanceRecords();
  const income = records.filter((record) => record.type === "income").reduce((sum, record) => sum + Number(record.amount), 0);
  const expense = records.filter((record) => record.type === "expense").reduce((sum, record) => sum + Number(record.amount), 0);
  const money = (value: number) => new Intl.NumberFormat(profile.locale === "en" ? "en-US" : "ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);
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
        subtitle: `${translateEnum(profile.locale, record.type)} · ${record.category}`,
        meta: formatDate(record.date, false, profile.locale),
        value: `${record.type === "income" ? "+" : "−"} ${money(Number(record.amount))}`,
      }))} />
  </>;
}
