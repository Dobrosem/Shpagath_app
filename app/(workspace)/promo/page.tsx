import { EntityDialog } from "@/components/entity-dialog";
import { SectionPage } from "@/components/section-page";
import { getPromoMaterials } from "@/lib/data";
import { formatDate } from "@/lib/utils";

const types = [
  ["poster", "Афиша"], ["video", "Видео"], ["teaser", "Тизер"], ["reels", "Reels"],
  ["shorts", "Shorts"], ["press_release", "Пресс-релиз"], ["vk_post", "Пост VK"],
  ["telegram_post", "Пост Telegram"], ["story", "История"], ["banner", "Баннер"],
].map(([value, label]) => ({ value, label }));

export default async function PromoPage() {
  const materials = await getPromoMaterials();
  return <SectionPage eyebrow="Коммуникации" title="Промо" description="Афиши, публикации, видео и пресс-материалы без смешивания с музыкальными файлами."
    action={<EntityDialog title="Промо-материал" table="promo_materials" path="/promo" fields={[
      { name: "title", label: "Название", required: true }, { name: "type", label: "Тип", type: "select", required: true, options: types },
      { name: "platform", label: "Платформа", type: "select", options: ["VK", "Telegram", "Instagram", "YouTube", "TikTok", "Яндекс Музыка", "Сайт", "Другое"].map((value) => ({ value, label: value })) },
      { name: "status", label: "Статус", type: "select", defaultValue: "draft", options: [
        { value: "draft", label: "Черновик" }, { value: "review", label: "На проверке" },
        { value: "approved", label: "Утверждено" }, { value: "scheduled", label: "Запланировано" }, { value: "published", label: "Опубликовано" },
      ] },
      { name: "publish_date", label: "Дата публикации", type: "datetime-local" }, { name: "media_url", label: "Ссылка на медиа", type: "url" }, { name: "publication_url", label: "Ссылка на публикацию", type: "url" }, { name: "content_text", label: "Текст", type: "textarea" },
    ]} />}
    rows={materials.map((material) => ({
      title: material.title,
      subtitle: `${material.type.replaceAll("_", " ")} · ${material.platform || "платформа не указана"}`,
      meta: formatDate(material.publish_date),
      status: material.status,
    }))} />;
}
