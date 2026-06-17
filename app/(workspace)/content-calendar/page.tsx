import { ContentCalendarCard, ContentCalendarCreateButton } from "@/components/content-calendar-components";
import { PageHeader } from "@/components/ui";
import { getAlbumRelationOptions, getContentCalendarItems, getCopyItems, getEpkProfiles, getEventRelationOptions, getProfile, getSongRelationOptions } from "@/lib/data";
import { translator } from "@/lib/i18n";
import type { ContentCalendarItem } from "@/lib/types";

function isOverdue(item: ContentCalendarItem) {
  return Boolean(item.scheduled_at && new Date(item.scheduled_at) < new Date() && !["published", "cancelled", "archived"].includes(item.status));
}

export default async function ContentCalendarPage() {
  const [items, profile, copyItems, events, albums, songs, epks] = await Promise.all([
    getContentCalendarItems(),
    getProfile(),
    getCopyItems("all"),
    getEventRelationOptions(),
    getAlbumRelationOptions(),
    getSongRelationOptions(),
    getEpkProfiles(),
  ]);
  const t = translator(profile.locale);
  const options = { copyItems, events, albums, songs, epks };
  const groups = [
    { title: t("contentCalendar.overdue"), items: items.filter(isOverdue) },
    { title: t("contentCalendar.scheduled"), items: items.filter((item) => !isOverdue(item) && ["ready", "scheduled"].includes(item.status)) },
    { title: t("contentCalendar.drafts"), items: items.filter((item) => !isOverdue(item) && ["idea", "draft"].includes(item.status)) },
    { title: t("contentCalendar.published"), items: items.filter((item) => item.status === "published") },
    { title: t("contentCalendar.noDate"), items: items.filter((item) => !item.scheduled_at && !["published"].includes(item.status)) },
  ];

  return <>
    <PageHeader
      eyebrow={t("nav.group.promotion")}
      title={t("contentCalendar.titlePage")}
      description={t("contentCalendar.descriptionPage")}
      action={["admin", "manager", "member"].includes(profile.role) ? <ContentCalendarCreateButton options={options} /> : undefined}
    />
    <div className="space-y-7">
      {groups.map((group) => group.items.length > 0 && <section key={group.title}>
        <h2 className="mb-3 font-display text-lg uppercase text-white">{group.title}</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {group.items.map((item) => <ContentCalendarCard key={item.id} item={item} />)}
        </div>
      </section>)}
      {!items.length && <div className="metal-card p-14 text-center text-sm text-zinc-600">{t("contentCalendar.noItems")}</div>}
    </div>
  </>;
}
