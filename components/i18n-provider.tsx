"use client";

import { createContext, useContext } from "react";
import { translate, type TranslationKey } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

const I18nContext = createContext<Locale>("ru");

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <I18nContext.Provider value={locale}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const locale = useContext(I18nContext);
  return { locale, t: (key: TranslationKey) => translate(locale, key) };
}
