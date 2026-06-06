"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { createEntity } from "@/app/actions";

interface Field {
  name: string;
  label: string;
  type?: "text" | "textarea" | "date" | "datetime-local" | "number" | "url" | "select";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
}

export function EntityDialog({ title, table, path, fields }: { title: string; table: "projects" | "tasks" | "songs" | "song_materials" | "events" | "promo_materials"; path: string; fields: Field[] }) {
  const [open, setOpen] = useState(false);
  const action = createEntity.bind(null, table, path);
  return <>
    <button className="button-primary" onClick={() => setOpen(true)}><Plus size={15} />Создать</button>
    {open && <div className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
      <div className="metal-card max-h-[90vh] w-full max-w-xl overflow-y-auto p-6" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between"><div><p className="eyebrow">Новая запись</p><h2 className="font-display text-2xl uppercase text-white">{title}</h2></div><button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-white"><X /></button></div>
        <form action={async (data) => { await action(data); setOpen(false); }} className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => <label key={field.name} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
            <span className="label">{field.label}</span>
            {field.type === "textarea"
              ? <textarea name={field.name} required={field.required} placeholder={field.placeholder} className="field min-h-24 resize-y py-3" />
              : field.type === "select"
                ? <select name={field.name} required={field.required} className="field"><option value="">Выберите</option>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                : <input name={field.name} required={field.required} placeholder={field.placeholder} type={field.type ?? "text"} className="field" />}
          </label>)}
          <div className="mt-2 flex justify-end gap-2 sm:col-span-2"><button type="button" className="button-secondary" onClick={() => setOpen(false)}>Отмена</button><button className="button-primary">Сохранить</button></div>
        </form>
      </div>
    </div>}
  </>;
}
