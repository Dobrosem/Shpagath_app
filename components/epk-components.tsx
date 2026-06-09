"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Copy, ExternalLink, Loader2, Plus, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createEpkMediaLink,
  createEpkProfile,
  deleteEpkMediaLinkForm,
  deleteEpkProfile,
  moveEpkMediaLink,
  updateEpkMediaLinkForm,
  updateEpkProfile,
} from "@/app/actions";
import type { ActionState, EpkMediaLink, EpkMediaType, EpkProfile } from "@/lib/types";
import { translateEnum } from "@/lib/i18n";
import { useI18n } from "./i18n-provider";

const initialState: ActionState = { success: false, error: null };
const mediaTypes: EpkMediaType[] = ["music", "video", "live_video", "interview", "press", "document", "photo_gallery", "other"];

function Field({
  name,
  label,
  value,
  type = "text",
  textarea,
  full,
}: {
  name: string;
  label: string;
  value?: string | null;
  type?: string;
  textarea?: boolean;
  full?: boolean;
}) {
  return <label className={full || textarea ? "sm:col-span-2" : ""}>
    <span className="label">{label}</span>
    {textarea
      ? <textarea name={name} defaultValue={value ?? ""} className="field min-h-28 resize-y py-3" />
      : <input name={name} type={type} defaultValue={value ?? ""} className="field" />}
  </label>;
}

export function EpkCreateButton() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createEpkProfile, initialState);
  const router = useRouter();
  const { locale, t } = useI18n();

  useEffect(() => {
    if (!state.success || !state.id) return;
    setOpen(false);
    router.push(`/epk/${state.id}`);
  }, [router, state]);

  return <>
    <button type="button" className="button-primary" onClick={() => setOpen(true)}><Plus size={15} />{t("epk.create")}</button>
    {open && <div className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={() => !pending && setOpen(false)}>
      <div className="metal-card w-full max-w-xl p-6" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <div><p className="eyebrow">{t("epk.pressKit")}</p><h2 className="font-display text-2xl uppercase text-white">{t("epk.create")}</h2></div>
          <button type="button" aria-label={t("common.close")} onClick={() => setOpen(false)} className="text-zinc-600 hover:text-white"><X /></button>
        </div>
        <form action={action} className="grid gap-4">
          <input type="hidden" name="locale" value={locale} />
          <Field name="title" label={t("epk.title")} />
          <Field name="slug" label={t("epk.slug")} />
          <label className="flex items-center gap-3 text-sm text-zinc-300">
            <input type="checkbox" name="is_public" className="h-4 w-4 accent-orange-500" />
            {t("epk.publicAccess")}
          </label>
          <p className="rounded-lg border border-white/[.06] bg-white/[.025] p-3 text-xs leading-5 text-zinc-500">{t("epk.createDocumentsHint")}</p>
          {state.error && <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300"><AlertCircle size={15} />{state.error}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" className="button-secondary" onClick={() => setOpen(false)}>{t("common.cancel")}</button>
            <button className="button-primary" disabled={pending}>{pending && <Loader2 size={14} className="animate-spin" />}{t("epk.create")}</button>
          </div>
        </form>
      </div>
    </div>}
  </>;
}

export function EpkProfileEditor({ epk, canDelete }: { epk: EpkProfile; canDelete: boolean }) {
  const { locale, t } = useI18n();
  const [state, action, pending] = useActionState(updateEpkProfile.bind(null, epk.id), initialState);
  const [deleteState, deleteAction, deleting] = useActionState(deleteEpkProfile.bind(null, epk.id), initialState);
  const router = useRouter();

  useEffect(() => {
    if (deleteState.success) router.push("/epk");
  }, [deleteState.success, router]);

  return <div className="space-y-5">
    <form action={action} className="metal-card p-5 sm:p-6">
      <input type="hidden" name="locale" value={locale} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">{t("epk.edit")}</p>
          <h2 className="font-display text-xl uppercase text-white">{t("epk.pressKit")}</h2>
        </div>
        <label className="flex items-center gap-3 text-xs text-zinc-300">
          <input type="checkbox" name="is_public" defaultChecked={epk.is_public} className="h-4 w-4 accent-orange-500" />
          {t("epk.publicAccess")}
        </label>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <Field name="title" label={t("epk.title")} value={epk.title} />
        <Field name="slug" label={t("epk.slug")} value={epk.slug} />
        <Field name="short_bio" label={t("epk.shortBio")} value={epk.short_bio} textarea />
        <Field name="full_bio" label={t("epk.fullBio")} value={epk.full_bio} textarea />
        <Field name="genre" label={t("epk.genre")} value={epk.genre} />
        <Field name="location" label={t("epk.location")} value={epk.location} />
      </section>

      <section className="mt-6 border-t border-white/[.06] pt-5">
        <h3 className="mb-4 font-display text-lg uppercase text-white">{t("epk.bookingContacts")}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="booking_email" label={t("epk.bookingEmail")} value={epk.booking_email} type="email" />
          <Field name="booking_phone" label={t("epk.bookingPhone")} value={epk.booking_phone} />
          <Field name="website_url" label={t("epk.website")} value={epk.website_url} type="url" />
          <Field name="vk_url" label="VK" value={epk.vk_url} type="url" />
          <Field name="telegram_url" label="Telegram" value={epk.telegram_url} type="url" />
          <Field name="youtube_url" label="YouTube" value={epk.youtube_url} type="url" />
          <Field name="yandex_music_url" label="Yandex Music" value={epk.yandex_music_url} type="url" />
          <Field name="spotify_url" label="Spotify" value={epk.spotify_url} type="url" />
          <Field name="apple_music_url" label="Apple Music" value={epk.apple_music_url} type="url" />
        </div>
      </section>

      <section className="mt-6 border-t border-white/[.06] pt-5">
        <h3 className="mb-4 font-display text-lg uppercase text-white">{t("epk.press")}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="press_quote" label={t("epk.pressQuote")} value={epk.press_quote} textarea />
          <Field name="achievements" label={t("epk.achievements")} value={epk.achievements} textarea />
          <Field name="tech_rider_url" label={t("epk.techRider")} value={epk.tech_rider_url} type="url" />
          <Field name="stage_plot_url" label={t("epk.stagePlot")} value={epk.stage_plot_url} type="url" />
          <Field name="logo_url" label={t("epk.logo")} value={epk.logo_url} type="url" />
          <Field name="hero_image_url" label={t("epk.heroImage")} value={epk.hero_image_url} type="url" />
        </div>
      </section>

      {state.error && <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300"><AlertCircle size={15} />{state.error}</div>}
      {state.success && <div className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300"><CheckCircle2 size={15} />{t("common.save")}</div>}
      <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-white/[.06] pt-5">
        <button className="button-primary" disabled={pending}>{pending && <Loader2 size={14} className="animate-spin" />}{t("common.save")}</button>
      </div>
    </form>

    {canDelete && <form action={deleteAction} className="metal-card flex flex-wrap items-center justify-between gap-3 border-red-500/10 p-5">
      <input type="hidden" name="locale" value={locale} />
      <p className="text-sm text-zinc-500">{t("epk.deleteWarning")}</p>
      <button className="button-secondary border-red-500/20 text-red-300 hover:bg-red-500/10" disabled={deleting}>
        {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}{t("common.delete")}
      </button>
      {deleteState.error && <p className="basis-full text-xs text-red-300">{deleteState.error}</p>}
    </form>}
  </div>;
}

export function EpkPublicLink({ epk }: { epk: EpkProfile }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const href = `/public/epk/${epk.slug}`;

  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}${href}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return <section className="metal-card p-5">
    <p className="eyebrow">{t("epk.publicLink")}</p>
    {epk.is_public ? <div className="flex flex-wrap items-center gap-2">
      <Link href={href} target="_blank" className="button-secondary"><ExternalLink size={14} />{href}</Link>
      <button type="button" className="button-secondary" onClick={copy}><Copy size={14} />{copied ? t("epk.linkCopied") : t("epk.copyLink")}</button>
    </div> : <p className="text-sm text-zinc-600">{t("epk.publicDisabled")}</p>}
  </section>;
}

export function EpkMediaManager({ epkId, links }: { epkId: string; links: EpkMediaLink[] }) {
  const { locale, t } = useI18n();
  const [addState, addAction, adding] = useActionState(createEpkMediaLink.bind(null, epkId), initialState);
  const [isMoving, startTransition] = useTransition();
  const router = useRouter();

  function move(linkId: string, direction: -1 | 1) {
    startTransition(async () => {
      await moveEpkMediaLink(epkId, linkId, direction);
      router.refresh();
    });
  }

  return <section className="metal-card p-5 sm:p-6">
    <div className="mb-5">
      <p className="eyebrow">{t("epk.links")}</p>
      <h2 className="font-display text-xl uppercase text-white">{t("epk.addMediaLink")}</h2>
    </div>

    <form action={addAction} className="grid gap-3 sm:grid-cols-[.8fr_1fr_1fr_auto]">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="order_index" value={links.length + 1} />
      <select name="type" className="field" defaultValue="music">
        {mediaTypes.map((type) => <option key={type} value={type}>{translateEnum(locale, type)}</option>)}
      </select>
      <input name="title" className="field" placeholder={t("epk.title")} />
      <input name="url" className="field" type="url" placeholder={t("epk.url")} />
      <button className="button-primary" disabled={adding}>{adding && <Loader2 size={14} className="animate-spin" />}<Plus size={14} />{t("common.add")}</button>
      <textarea name="description" className="field min-h-20 py-3 sm:col-span-4" placeholder={t("common.summary")} />
      {addState.error && <p className="text-xs text-red-300 sm:col-span-4">{addState.error}</p>}
    </form>

    <div className="mt-6 divide-y divide-white/[.06]">
      {links.map((link, index) => <form action={updateEpkMediaLinkForm.bind(null, epkId, link.id)} key={link.id} className="grid gap-3 py-4 lg:grid-cols-[.7fr_1fr_1.2fr_auto]">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="order_index" value={link.order_index} />
        <select name="type" className="field" defaultValue={link.type}>
          {mediaTypes.map((type) => <option key={type} value={type}>{translateEnum(locale, type)}</option>)}
        </select>
        <input name="title" className="field" defaultValue={link.title} />
        <input name="url" className="field" type="url" defaultValue={link.url} />
        <div className="flex gap-1">
          <button type="button" className="grid h-10 w-10 place-items-center rounded-lg border border-white/[.08] text-zinc-500 disabled:opacity-30" disabled={index === 0 || isMoving} onClick={() => move(link.id, -1)}><ChevronUp size={15} /></button>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-lg border border-white/[.08] text-zinc-500 disabled:opacity-30" disabled={index === links.length - 1 || isMoving} onClick={() => move(link.id, 1)}><ChevronDown size={15} /></button>
          <button className="button-secondary">{t("common.save")}</button>
        </div>
        <textarea name="description" className="field min-h-20 py-3 lg:col-span-3" defaultValue={link.description ?? ""} />
        <button formAction={deleteEpkMediaLinkForm.bind(null, epkId, link.id)} className="button-secondary border-red-500/20 text-red-300"><Trash2 size={14} />{t("epk.deleteMediaLink")}</button>
      </form>)}
      {!links.length && <p className="py-8 text-center text-sm text-zinc-600">{t("common.noData")}</p>}
    </div>
  </section>;
}
