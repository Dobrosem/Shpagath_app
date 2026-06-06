"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { updateLocale } from "@/app/actions";
import { useI18n } from "./i18n-provider";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function select(nextLocale: Locale) {
    if (nextLocale === locale || pending) return;
    setPending(true);
    setError(null);
    const result = await updateLocale(nextLocale);
    if (!result.success) {
      setError(result.error);
      setPending(false);
      return;
    }
    router.refresh();
    setPending(false);
  }

  return <div>
    <div className="grid gap-2 sm:grid-cols-2">
      {(["ru", "en"] as Locale[]).map((value) => <button key={value} onClick={() => select(value)} disabled={pending} className={cn("flex items-center justify-between rounded-lg border p-4 text-sm transition", locale === value ? "border-zinc-500 bg-white/[.06] text-white" : "border-white/[.07] text-zinc-500 hover:border-white/15")}>
        {t(`language.${value}`)}
        {pending ? <Loader2 size={14} className="animate-spin" /> : locale === value ? <Check size={14} /> : null}
      </button>)}
    </div>
    {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
  </div>;
}
