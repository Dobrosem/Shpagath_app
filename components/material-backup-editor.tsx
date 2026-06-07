"use client";

import { DatabaseBackup, Loader2, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { upsertMaterialBackup } from "@/app/actions";
import type { ActionState, MaterialBackup, Profile } from "@/lib/types";
import { translateEnum } from "@/lib/i18n";
import { useI18n } from "./i18n-provider";

const initialState: ActionState = { success: false, error: null };

export function MaterialBackupEditor({
  materialId,
  songId,
  backup,
  profiles,
}: {
  materialId: string;
  songId: string;
  backup?: MaterialBackup | null;
  profiles: Profile[];
}) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    upsertMaterialBackup.bind(null, materialId, songId),
    initialState,
  );
  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return <>
    <button
      type="button"
      title={t("backup.title")}
      onClick={() => setOpen(true)}
      className={backup?.status === "ok" ? "text-emerald-400" : "text-amber-400"}
    >
      <DatabaseBackup size={16} />
    </button>
    {open && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={() => !pending && setOpen(false)}>
      <div className="metal-card w-full max-w-xl p-6" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl uppercase text-white">{t("backup.title")}</h2>
          <button type="button" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          <label><span className="label">{t("backup.status")}</span>
            <select className="field" name="status" defaultValue={backup?.status ?? "missing_backup"}>
              {["missing_backup", "unchecked", "ok", "problem"].map((status) => (
                <option key={status} value={status}>{translateEnum(locale, status)}</option>
              ))}
            </select>
          </label>
          <label><span className="label">{t("backup.responsible")}</span>
            <select className="field" name="responsible_id" defaultValue={backup?.responsible_id ?? ""}>
              <option value="">{t("common.select")}</option>
              {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2"><span className="label">{t("backup.url")}</span>
            <input className="field" type="url" name="backup_url" defaultValue={backup?.backup_url ?? ""} />
          </label>
          <label className="sm:col-span-2"><span className="label">{t("backup.location")}</span>
            <input className="field" name="backup_location" defaultValue={backup?.backup_location ?? ""} />
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <input type="checkbox" name="has_local_copy" defaultChecked={backup?.has_local_copy} />
            {t("backup.localCopy")}
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <input type="checkbox" name="has_cloud_copy" defaultChecked={backup?.has_cloud_copy} />
            {t("backup.cloudCopy")}
          </label>
          <label className="sm:col-span-2"><span className="label">{t("backup.notes")}</span>
            <textarea className="field min-h-20 py-3" name="notes" defaultValue={backup?.notes ?? ""} />
          </label>
          {state.error && <p className="text-xs text-red-300 sm:col-span-2">{state.error}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" className="button-secondary" onClick={() => setOpen(false)}>{t("common.cancel")}</button>
            <button className="button-primary" disabled={pending}>
              {pending && <Loader2 size={14} className="animate-spin" />}{t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>}
  </>;
}

