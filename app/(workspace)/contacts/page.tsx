import { Plus } from "lucide-react";
import { SectionPage } from "@/components/section-page";

export default function ContactsPage() {
  return <SectionPage eyebrow="Сеть" title="Контакты" description="Площадки, подрядчики, музыканты, промоутеры и история работы."
    action={<button className="button-primary"><Plus size={15} />Добавить контакт</button>}
    rows={[
      { title: "URBAN", subtitle: "venue · Москва · +7 495 000-00-00", meta: "Надёжность 5/5" },
      { title: "Андрей Лебедев", subtitle: "sound_engineer · Москва · andrey@example.com", meta: "Надёжность 5/5" },
      { title: "Мария Соколова", subtitle: "photographer · Санкт-Петербург", meta: "Надёжность 4/5" },
      { title: "Heavy Music Media", subtitle: "media · Россия · редакция", meta: "3 публикации" },
    ]} />;
}
