"use client";

import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { useActionState, useTransition } from "react";
import {
  addPackingListItem,
  deletePackingListItem,
  setPackingListItemPacked,
} from "@/app/actions";
import type { ActionState, PackingListItem, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { translateEnum } from "@/lib/i18n";
import { useI18n } from "./i18n-provider";

const initialState: ActionState = { success: false, error: null };

export function PackingListItems({
  listId,
  items,
  profiles,
}: {
  listId: string;
  items: PackingListItem[];
  profiles: Profile[];
}) {
  const { locale, t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [state, action, adding] = useActionState(
    addPackingListItem.bind(null, listId),
    initialState,
  );

  return <div className="space-y-5">
    <div className="metal-card divide-y divide-white/[.055]">
      {items.map((item) => <div key={item.id} className="flex items-start gap-3 p-4">
        <button
          type="button"
          aria-label={t("packing.toggleItem")}
          title={t("packing.toggleItem")}
          disabled={pending}
          onClick={() => startTransition(async () => {
            await setPackingListItemPacked(listId, item.id, !item.packed);
          })}
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-lg border",
            item.packed
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-white/10 text-transparent",
          )}
        >
          <Check size={13} />
        </button>
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm text-zinc-200", item.packed && "text-zinc-600 line-through")}>{item.title}</p>
          <p className="mt-1 text-[10px] text-zinc-600">
            {translateEnum(locale, item.category)} · {item.quantity}
            {item.responsible?.full_name ? ` · ${item.responsible.full_name}` : ""}
          </p>
          {item.notes && <p className="mt-2 text-xs text-zinc-500">{item.notes}</p>}
        </div>
        <button
          type="button"
          aria-label={t("packing.deleteItem")}
          title={t("packing.deleteItem")}
          disabled={pending}
          onClick={() => startTransition(async () => {
            if (!window.confirm(t("packing.deleteConfirm"))) return;
            await deletePackingListItem(listId, item.id);
          })}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-zinc-700 transition hover:bg-red-500/10 hover:text-red-300"
        >
          <Trash2 size={15} />
        </button>
      </div>)}
      {!items.length && <p className="p-10 text-center text-sm text-zinc-600">{t("packing.noItems")}</p>}
    </div>

    <form action={action} className="metal-card grid gap-4 p-5 sm:grid-cols-2">
      <h2 className="font-display text-lg uppercase text-white sm:col-span-2">{t("packing.addItem")}</h2>
      <label><span className="label">{t("packing.title")}</span><input className="field" name="title" required /></label>
      <label><span className="label">{t("packing.category")}</span>
        <select className="field" name="category" defaultValue="other">
          {["instruments", "cables", "audio", "electronics", "storage_media", "clothing", "merch", "documents", "other"].map((category) => (
            <option key={category} value={category}>{translateEnum(locale, category)}</option>
          ))}
        </select>
      </label>
      <label><span className="label">{t("packing.quantity")}</span><input className="field" type="number" min="1" name="quantity" defaultValue="1" /></label>
      <label><span className="label">{t("packing.responsible")}</span>
        <select className="field" name="responsible_id" defaultValue="">
          <option value="">{t("common.select")}</option>
          {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name}</option>)}
        </select>
      </label>
      <label className="sm:col-span-2"><span className="label">{t("packing.notes")}</span><textarea className="field min-h-20 py-3" name="notes" /></label>
      {state.error && <p className="text-xs text-red-300 sm:col-span-2">{state.error}</p>}
      <div className="flex justify-end sm:col-span-2">
        <button className="button-primary" disabled={adding}>
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}{t("common.add")}
        </button>
      </div>
    </form>
  </div>;
}
