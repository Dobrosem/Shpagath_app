"use client";

import { Loader2 } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";

export default function WorkspaceLoading() {
  const { t } = useI18n();
  return <div className="metal-card flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
    <Loader2 size={24} className="animate-spin text-zinc-500" />
    <p className="text-sm text-zinc-500">{t("common.loading")}</p>
  </div>;
}
