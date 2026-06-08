import Link from "next/link";
import { ArrowUpRight, FileText } from "lucide-react";
import { EpkCreateButton } from "@/components/epk-components";
import { PageHeader } from "@/components/ui";
import { getEpkProfiles, getProfile } from "@/lib/data";
import { translator } from "@/lib/i18n";

export default async function EpkPage() {
  const [profiles, profile] = await Promise.all([getEpkProfiles(), getProfile()]);
  const t = translator(profile.locale);

  return <>
    <PageHeader
      eyebrow={t("epk.pressKit")}
      title={t("page.epk.title")}
      description={t("page.epk.description")}
      action={["admin", "manager", "member"].includes(profile.role) ? <EpkCreateButton /> : undefined}
    />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {profiles.map((epk) => <Link key={epk.id} href={`/epk/${epk.id}`} className="metal-card group flex min-h-56 flex-col justify-between p-5 transition hover:border-white/15">
        <div>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg border border-white/[.08] bg-white/[.03] text-zinc-500"><FileText size={20} /></div>
            <span className={epk.is_public ? "badge border-emerald-500/25 bg-emerald-500/10 text-emerald-300" : "badge border-white/10 bg-white/5 text-zinc-400"}>
              {epk.is_public ? t("epk.publicAccessOn") : t("epk.publicAccessOff")}
            </span>
          </div>
          <p className="font-display text-2xl uppercase leading-tight text-white">{epk.title}</p>
          <p className="mt-2 text-xs text-zinc-600">/public/epk/{epk.slug}</p>
          {epk.short_bio && <p className="mt-4 line-clamp-3 text-sm leading-6 text-zinc-500">{epk.short_bio}</p>}
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-white/[.06] pt-4 text-xs text-zinc-600">
          <span>{epk.media_links?.length ?? 0} {t("common.items")}</span>
          <span className="inline-flex items-center gap-1 text-zinc-400 group-hover:text-white">{t("common.open")}<ArrowUpRight size={13} /></span>
        </div>
      </Link>)}
      {!profiles.length && <div className="metal-card col-span-full p-14 text-center text-sm text-zinc-600">{t("epk.empty")}</div>}
    </div>
  </>;
}
