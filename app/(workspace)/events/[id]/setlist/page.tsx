import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { notFound } from "next/navigation";
import { SetlistBuilder } from "@/components/setlist-builder";
import { PageHeader } from "@/components/ui";
import { getEventSetlist, getProfile, getSetlistSongOptions, safeSupabaseQuery } from "@/lib/data";
import { translator } from "@/lib/i18n";
import { canDeleteOperationalData } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export default async function EventSetlistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [supabase, profile, songs, setlist] = await Promise.all([
    createClient(),
    getProfile(),
    getSetlistSongOptions(),
    getEventSetlist(id),
  ]);
  if (!supabase) notFound();

  const { data: event, error } = await safeSupabaseQuery(
    "event setlist page event",
    supabase
      .from("events")
      .select("id,title")
      .eq("id", id)
      .maybeSingle(),
    { data: null, error: null },
  );
  if (error || !event) notFound();

  const t = translator(profile.locale);
  const canEdit = canDeleteOperationalData(profile.role);
  const sortedSongs = [...songs].sort((a, b) =>
    a.title.localeCompare(b.title, profile.locale),
  );

  return <>
    <Link href={`/events/${id}`} className="mb-5 inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-white">
      <ArrowLeft size={14} />{t("battleSheet.backToEvent")}
    </Link>
    <PageHeader
      eyebrow={profile.locale === "en" ? "Setlist builder" : "Конструктор сетлиста"}
      title={t("setlistBuilder.title")}
      description={event.title}
      action={<Link href={`/events/${id}/setlist/print`} className="button-secondary">
        <Printer size={14} />{t("printSetlist.printSetlist")}
      </Link>}
    />
    {canEdit ? <SetlistBuilder
      eventId={id}
      songs={sortedSongs}
      initialItems={setlist?.items ?? []}
    /> : <section className="metal-card p-6 text-sm text-zinc-500">{profile.locale === "en" ? "Only administrators and managers can edit setlists." : "Редактировать сетлисты могут только администраторы и менеджеры."}</section>}
  </>;
}
