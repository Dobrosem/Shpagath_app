import { notFound, redirect } from "next/navigation";
import { PrintSetlistActions } from "@/components/print-setlist-actions";
import { translateEnum, translator } from "@/lib/i18n";
import { getLogoSrc, getPrintableSetlistData } from "@/lib/print-setlist";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

export default async function PrintEventSetlistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/login?next=/events/${id}/setlist/print`);

  const profileResult = await supabase
    .from("profiles")
    .select("locale")
    .eq("id", user.id)
    .maybeSingle();
  const locale: Locale = profileResult.data?.locale === "en" ? "en" : "ru";
  const t = translator(locale);

  const printable = await getPrintableSetlistData({
    supabase,
    eventId: id,
    locale,
    labels: {
      soundcheck: t("printSetlist.soundcheck"),
      doors: t("printSetlist.doors"),
      showStart: t("printSetlist.showStartShort"),
    },
  });
  if (!printable) notFound();

  const { event, setlistItems, materials, eventMeta, timingMeta } = printable;
  const logoSrc = getLogoSrc();

  return <main className="print-page print-setlist min-h-screen bg-white px-5 py-6 text-zinc-950 sm:px-8 lg:px-12">
    <div className="mx-auto max-w-5xl">
      <PrintSetlistActions
        backHref={`/events/${id}/setlist`}
        backLabel={t("printSetlist.backToSetlist")}
        printLabel={t("printSetlist.print")}
        pdfHref={`/events/${id}/setlist/pdf`}
        pdfLabel={t("printSetlist.downloadPdf")}
      />

      <header className="print-setlist-header text-center">
        <div className="print-logo mx-auto flex min-h-24 items-center justify-center">
          {logoSrc
            ? <img src={logoSrc} alt="Saphath" className="print-logo-image mx-auto h-auto w-[62%] max-w-[680px] object-contain" />
            : <p className="font-display text-6xl font-black uppercase tracking-[.18em] text-zinc-950 sm:text-7xl">Saphath</p>}
        </div>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[.18em] text-zinc-500">{t("printSetlist.setlist")}</p>
        <p className="mt-2 text-[10px] uppercase tracking-[.14em] text-zinc-600">{eventMeta.join(" • ")}</p>
        {!!timingMeta.length && <p className="mt-1 text-[9px] uppercase tracking-[.12em] text-zinc-500">{timingMeta.join(" • ")}</p>}
      </header>

      <section className="mt-10">
        {setlistItems.length ? <ol className="space-y-7">
          {setlistItems.map((item, index) => {
            const song = item.song;
            const meta = [
              song?.album?.title ? `${t("printSetlist.album")}: ${song.album.title}` : null,
              song?.bpm ? `BPM: ${song.bpm}` : null,
              song?.key ? `Key: ${song.key}` : null,
              song?.tuning ? `Tuning: ${song.tuning}` : null,
              song?.duration ? `Duration: ${formatDuration(song.duration)}` : null,
            ].filter(Boolean);
            return <li key={item.id} className="print-song-row break-inside-avoid">
              <div className="flex gap-5">
                <span className="w-12 shrink-0 pt-1 text-right text-2xl font-black leading-none text-zinc-950 sm:text-3xl">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <h1 className="print-song-title text-3xl font-black uppercase leading-tight tracking-wide text-zinc-950 sm:text-5xl">{song?.title ?? t("battleSheet.notSpecified")}</h1>
                  {!!meta.length && <p className="mt-1 text-[10px] uppercase tracking-[.12em] text-zinc-500">{meta.join(" • ")}</p>}
                  {(item.live_version || item.notes) && <div className="mt-2 space-y-1 text-xs leading-5 text-zinc-700">
                    {item.live_version && <p className="whitespace-pre-wrap">{t("printSetlist.liveVersion")}: {item.live_version}</p>}
                    {item.notes && <p className="whitespace-pre-wrap">{t("printSetlist.performanceNotes")}: {item.notes}</p>}
                  </div>}
                </div>
              </div>
            </li>;
          })}
        </ol> : <p className="mt-4 text-sm text-zinc-700">{t("printSetlist.empty")}</p>}
      </section>

      {!!materials.length && <section className="print-materials mt-10 break-inside-avoid border-t border-zinc-200 pt-4">
        <h2 className="text-[10px] font-bold uppercase tracking-[.18em] text-zinc-600">{t("printSetlist.materials")}</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {materials.map((material) => <div key={material.id} className="break-inside-avoid text-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[.1em] text-zinc-950">{material.song?.title ?? t("battleSheet.notSpecified")}</p>
            <p className="text-[10px] text-zinc-700">
              {translateEnum(locale, material.type)}: {material.title}
              {material.version ? ` (${material.version})` : ""}
            </p>
            {material.url && <p className="break-all text-[9px] text-zinc-500">{material.url}</p>}
          </div>)}
        </div>
      </section>}
    </div>
  </main>;
}
