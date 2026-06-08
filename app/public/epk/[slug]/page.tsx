import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EpkMediaLink, EpkProfile } from "@/lib/types";

const mediaGroups = [
  { type: "music", title: "Музыка" },
  { type: "video", title: "Видео" },
  { type: "live_video", title: "Live-видео" },
  { type: "interview", title: "Интервью" },
  { type: "press", title: "Пресса" },
  { type: "document", title: "Документы" },
  { type: "photo_gallery", title: "Фото" },
] as const;

function ExternalLink({ href, children }: { href?: string | null; children: React.ReactNode }) {
  if (!href) return null;
  return <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-sm border border-zinc-300 px-3 py-2 text-xs uppercase tracking-[.12em] text-zinc-900 transition hover:bg-zinc-900 hover:text-white">
    {children}
  </a>;
}

export default async function PublicEpkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data, error } = await supabase
    .from("epk_profiles")
    .select("*, media_links:epk_media_links(*)")
    .eq("slug", slug)
    .eq("is_public", true)
    .order("order_index", { referencedTable: "epk_media_links" })
    .maybeSingle();
  if (error || !data) notFound();

  const epk = data as EpkProfile;
  const links = (epk.media_links ?? []) as EpkMediaLink[];
  const socials = [
    ["Website", epk.website_url],
    ["VK", epk.vk_url],
    ["Telegram", epk.telegram_url],
    ["YouTube", epk.youtube_url],
    ["Yandex Music", epk.yandex_music_url],
    ["Spotify", epk.spotify_url],
    ["Apple Music", epk.apple_music_url],
  ] as const;

  return <main className="min-h-screen bg-[#f7f5f0] text-zinc-950">
    {epk.hero_image_url && <div className="h-[38vh] min-h-72 bg-zinc-900">
      <img src={epk.hero_image_url} alt="" className="h-full w-full object-cover" />
    </div>}
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="border-b border-zinc-300 pb-8">
        {epk.logo_url && <img src={epk.logo_url} alt={epk.title} className="mb-6 max-h-24 max-w-64 object-contain" />}
        <p className="text-xs uppercase tracking-[.2em] text-zinc-500">Saphath EPK</p>
        <h1 className="mt-3 font-display text-5xl uppercase leading-none sm:text-7xl">{epk.title}</h1>
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm uppercase tracking-[.12em] text-zinc-600">
          {epk.genre && <span>{epk.genre}</span>}
          {epk.location && <span>{epk.location}</span>}
        </div>
      </header>

      <section className="grid gap-8 border-b border-zinc-300 py-8 md:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          {epk.short_bio && <p className="text-xl leading-8 text-zinc-800">{epk.short_bio}</p>}
          {epk.full_bio && <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-700">{epk.full_bio}</p>}
          {epk.press_quote && <blockquote className="border-l-2 border-zinc-900 pl-5 text-lg leading-8 text-zinc-900">{epk.press_quote}</blockquote>}
          {epk.achievements && <div><h2 className="mb-3 text-xs uppercase tracking-[.18em] text-zinc-500">Достижения</h2><p className="whitespace-pre-wrap text-sm leading-7 text-zinc-700">{epk.achievements}</p></div>}
        </div>
        <aside className="space-y-5">
          <div>
            <h2 className="mb-3 text-xs uppercase tracking-[.18em] text-zinc-500">Контакты для букинга</h2>
            <div className="space-y-2 text-sm">
              {epk.booking_email && <a href={`mailto:${epk.booking_email}`} className="block underline decoration-zinc-400 underline-offset-4">{epk.booking_email}</a>}
              {epk.booking_phone && <a href={`tel:${epk.booking_phone}`} className="block underline decoration-zinc-400 underline-offset-4">{epk.booking_phone}</a>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {socials.map(([label, href]) => <ExternalLink key={label} href={href}>{label}</ExternalLink>)}
            <ExternalLink href={epk.tech_rider_url}>Технический райдер</ExternalLink>
            <ExternalLink href={epk.stage_plot_url}>Stage plot</ExternalLink>
          </div>
        </aside>
      </section>

      {mediaGroups.map((group) => {
        const groupLinks = links.filter((link) => link.type === group.type);
        if (!groupLinks.length) return null;
        return <section key={group.type} className="border-b border-zinc-300 py-8">
          <h2 className="mb-5 text-xs uppercase tracking-[.18em] text-zinc-500">{group.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {groupLinks.map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="rounded-sm border border-zinc-300 p-4 transition hover:border-zinc-900">
              <p className="font-display text-xl uppercase">{link.title}</p>
              {link.description && <p className="mt-2 text-sm leading-6 text-zinc-600">{link.description}</p>}
            </a>)}
          </div>
        </section>;
      })}
    </div>
  </main>;
}
