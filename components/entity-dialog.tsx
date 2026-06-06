"use client";

import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createEntity,
  createSong,
  createTask,
} from "@/app/actions";
import type { ActionState } from "@/lib/types";
import { useI18n } from "./i18n-provider";
import { translateEnum, translateLiteral } from "@/lib/i18n";

interface Field {
  name: string;
  label: string;
  type?: "text" | "textarea" | "date" | "datetime-local" | "number" | "url" | "select";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  fullWidth?: boolean;
}

type EntityTable =
  | "projects"
  | "tasks"
  | "songs"
  | "song_materials"
  | "events"
  | "rehearsals"
  | "promo_materials"
  | "contacts"
  | "finance_records";

const initialActionState: ActionState = { success: false, error: null };

export function EntityDialog({
  title,
  table,
  path,
  fields,
  hiddenValues,
  detailPath,
}: {
  title: string;
  table: EntityTable;
  path: string;
  fields: Field[];
  hiddenValues?: Record<string, string>;
  detailPath?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { locale, t } = useI18n();
  const text = (value: string) => translateLiteral(locale, value);
  const action = table === "songs"
    ? createSong
    : table === "tasks"
      ? createTask
      : createEntity.bind(null, table, path);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    initialActionState,
  );

  useEffect(() => {
    if (!state.success) return;
    setOpen(false);
    if (detailPath && state.id) {
      router.push(`${detailPath}/${state.id}`);
    } else {
      router.refresh();
    }
  }, [detailPath, router, state]);

  return <>
    <button className="button-primary" onClick={() => setOpen(true)}>
      <Plus size={15} />{t("common.create")}
    </button>
    {open && <div className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={() => !pending && setOpen(false)}>
      <div className="metal-card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <div><p className="eyebrow">{t("common.newRecord")}</p><h2 className="font-display text-2xl uppercase text-white">{text(title)}</h2></div>
          <button disabled={pending} onClick={() => setOpen(false)} className="text-zinc-600 hover:text-white"><X /></button>
        </div>
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          {Object.entries(hiddenValues ?? {}).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
          {fields.map((field) => <label key={field.name} className={field.type === "textarea" || field.fullWidth ? "sm:col-span-2" : ""}>
            <span className="label">{text(field.label)}</span>
            {field.type === "textarea"
              ? <textarea name={field.name} required={field.required} defaultValue={field.defaultValue} placeholder={field.placeholder ? text(field.placeholder) : undefined} className="field min-h-24 resize-y py-3" />
              : field.type === "select"
                ? <select name={field.name} required={field.required} defaultValue={field.defaultValue ?? ""} className="field"><option value="">{t("common.select")}</option>{field.options?.map((option) => <option key={option.value} value={option.value}>{translateEnum(locale, option.value, text(option.label), table === "events" && field.name === "status" ? "event" : undefined)}</option>)}</select>
                : <input name={field.name} required={field.required} defaultValue={field.defaultValue} placeholder={field.placeholder ? text(field.placeholder) : undefined} type={field.type ?? "text"} className="field" />}
          </label>)}
          {state.error && <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300 sm:col-span-2"><AlertCircle size={15} className="shrink-0" />{state.error}</div>}
          <div className="mt-2 flex justify-end gap-2 sm:col-span-2">
            <button disabled={pending} type="button" className="button-secondary" onClick={() => setOpen(false)}>{t("common.cancel")}</button>
            <button disabled={pending} className="button-primary">{pending && <Loader2 size={14} className="animate-spin" />}{pending ? t("common.saving") : t("common.save")}</button>
          </div>
        </form>
      </div>
    </div>}
  </>;
}
