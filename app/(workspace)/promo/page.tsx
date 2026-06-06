import { EntityDialog } from "@/components/entity-dialog";
import { SectionPage } from "@/components/section-page";

const options = (values: string[]) => values.map((value) => ({ value, label: value.replaceAll("_", " ") }));
export default function PromoPage() {
  return <SectionPage eyebrow="Коммуникации" title="Промо" description="Афиши, публикации, видео и пресс-материалы без смешивания с музыкальными файлами."
    action={<EntityDialog title="Промо-материал" table="promo_materials" path="/promo" fields={[
      { name: "title", label: "Название", required: true }, { name: "type", label: "Тип", type: "select", required: true, options: options(["poster", "video", "teaser", "reels", "shorts", "press_release", "vk_post", "telegram_post", "story", "banner"]) },
      { name: "platform", label: "Платформа", type: "select", options: options(["VK", "Telegram", "Instagram", "YouTube", "TikTok", "Yandex Music", "Website", "Other"]) },
      { name: "status", label: "Статус", type: "select", required: true, options: options(["draft", "review", "approved", "scheduled", "published"]) },
      { name: "publish_date", label: "Дата публикации", type: "datetime-local" }, { name: "media_url", label: "Медиа", type: "url" }, { name: "publication_url", label: "Публикация", type: "url" }, { name: "content_text", label: "Текст", type: "textarea" },
    ]} />}
    rows={[
      { title: "Афиша · Москва / URBAN", subtitle: "poster · VK, Telegram, Website", meta: "10 июня", status: "approved" },
      { title: "Тизер The Last Light · 15 sec", subtitle: "reels · Instagram, VK Clips, Shorts", meta: "15 июня", status: "review" },
      { title: "Анонс концерта · основной текст", subtitle: "vk_post · ответственный Анна", meta: "12 июня", status: "scheduled" },
      { title: "Пресс-релиз Ascension", subtitle: "press_release · СМИ и тематические паблики", meta: "28 июня", status: "draft" },
    ]} />;
}
