import { EntityDialog } from "@/components/entity-dialog";
import { SectionPage } from "@/components/section-page";
import { getContacts } from "@/lib/data";

const contactTypes = [
  ["venue", "Площадка"], ["sound_engineer", "Звукорежиссёр"], ["light_engineer", "Художник по свету"],
  ["photographer", "Фотограф"], ["videographer", "Видеограф"], ["designer", "Дизайнер"],
  ["journalist", "Журналист"], ["media", "СМИ"], ["promoter", "Промоутер"], ["organizer", "Организатор"],
  ["session_musician", "Сессионный музыкант"], ["orchestra", "Оркестр"], ["choir", "Хор"], ["manager", "Менеджер"], ["other", "Другое"],
].map(([value, label]) => ({ value, label }));

export default async function ContactsPage() {
  const contacts = await getContacts();
  return <SectionPage eyebrow="Сеть" title="Контакты" description="Площадки, подрядчики, музыканты, промоутеры и история работы."
    action={<EntityDialog title="Контакт" table="contacts" path="/contacts" fields={[
      { name: "name", label: "Имя или название", required: true }, { name: "type", label: "Тип", type: "select", required: true, options: contactTypes },
      { name: "city", label: "Город" }, { name: "phone", label: "Телефон" }, { name: "email", label: "Email" },
      { name: "social_url", label: "Социальная сеть", type: "url" }, { name: "website", label: "Сайт", type: "url" },
      { name: "reliability_rating", label: "Надёжность, 1–5", type: "number" },
      { name: "notes", label: "Заметки", type: "textarea" }, { name: "history", label: "История работы", type: "textarea" },
    ]} />}
    rows={contacts.map((contact) => ({
      title: contact.name,
      subtitle: `${contact.type.replaceAll("_", " ")} · ${contact.city || "город не указан"} · ${contact.phone || contact.email || "контакт не указан"}`,
      meta: contact.reliability_rating ? `Надёжность ${contact.reliability_rating}/5` : "Без оценки",
    }))} />;
}
