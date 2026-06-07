"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { useI18n } from "@/components/i18n-provider";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error("Workspace route error:", error);
  }, [error]);

  return <div className="metal-card flex min-h-64 flex-col items-center justify-center p-8 text-center">
    <div className="grid h-11 w-11 place-items-center rounded-lg bg-red-500/10 text-red-300">
      <AlertTriangle size={20} />
    </div>
    <h1 className="mt-5 font-display text-xl uppercase text-white">{t("common.errorTitle")}</h1>
    <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-600">{t("common.errorDescription")}</p>
    <button type="button" className="button-secondary mt-5" onClick={reset}>
      <RotateCcw size={14} />{t("common.tryAgain")}
    </button>
  </div>;
}
