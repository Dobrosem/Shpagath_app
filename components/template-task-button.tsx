"use client";

import { ListPlus, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { createTasksFromTemplate } from "@/app/actions";
import { useI18n } from "./i18n-provider";

export function TemplateTaskButton({ eventId }: { eventId: string }) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return <div className="flex flex-col items-end gap-1">
    <button
      className="button-secondary"
      disabled={pending}
      onClick={() => startTransition(async () => {
        const result = await createTasksFromTemplate(eventId);
        setMessage(result.error ?? (
          result.count
            ? `${t("template.created")}: ${result.count}`
            : t("template.noNewTasks")
        ));
      })}
    >
      {pending ? <Loader2 size={15} className="animate-spin" /> : <ListPlus size={15} />}
      {t("template.createTasks")}
    </button>
    {message && <span className="max-w-72 text-right text-[10px] text-zinc-500">{message}</span>}
  </div>;
}

