"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useActionState } from "react";
import { updateUserRole } from "@/app/actions";
import { translateLiteral } from "@/lib/i18n";
import { roleValues } from "@/lib/roles";
import type { ActionState, Locale, Profile } from "@/lib/types";
import { initials } from "@/lib/utils";

const initialState: ActionState = { success: false, error: null };

function UserRoleRow({ person, locale }: { person: Profile; locale: Locale }) {
  const [state, action, pending] = useActionState(updateUserRole.bind(null, person.id), initialState);

  return <form action={action} className="grid gap-3 border-b border-white/[.06] py-4 last:border-0 md:grid-cols-[1fr_220px_auto] md:items-center">
    <input type="hidden" name="locale" value={locale} />
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zinc-800 text-[10px]">
        {initials(person.full_name)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm text-zinc-200">{person.full_name}</p>
        <p className="mt-1 truncate text-[10px] text-zinc-600">{person.email}</p>
      </div>
    </div>
    <select className="field h-10" name="role" defaultValue={person.role}>
      {roleValues.map((role) => <option key={role} value={role}>{translateLiteral(locale, role)}</option>)}
    </select>
    <button className="button-secondary justify-center" disabled={pending}>
      {pending && <Loader2 size={14} className="animate-spin" />}
      {locale === "en" ? "Save role" : "Сохранить роль"}
    </button>
    {(state.error || state.success) && <p className={`flex items-center gap-2 text-xs md:col-span-3 ${state.error ? "text-red-300" : "text-emerald-300"}`}>
      {state.error ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
      {state.error ?? (locale === "en" ? "Role updated" : "Роль обновлена")}
    </p>}
  </form>;
}

export function UserRoleManager({ people, locale }: { people: Profile[]; locale: Locale }) {
  return <div className="metal-card p-6">
    <div className="mb-4">
      <h2 className="font-display text-lg uppercase text-white">
        {locale === "en" ? "User roles" : "Роли пользователей"}
      </h2>
      <p className="mt-2 text-xs leading-5 text-zinc-600">
        {locale === "en"
          ? "Only administrators can change workspace roles."
          : "Изменять роли в рабочем пространстве могут только администраторы."}
      </p>
    </div>
    <div>
      {people.map((person) => <UserRoleRow key={person.id} person={person} locale={locale} />)}
    </div>
  </div>;
}
