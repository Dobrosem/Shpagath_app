"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export function DetailLoadError({
  title,
  description,
  actionLabel,
}: {
  title: string;
  description: string;
  actionLabel: string;
}) {
  const router = useRouter();
  return <section className="metal-card mx-auto max-w-2xl p-8 text-center">
    <p className="font-display text-2xl uppercase text-white">{title}</p>
    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500">{description}</p>
    <button type="button" className="button-primary mt-6" onClick={() => router.refresh()}>
      <RefreshCw size={14} />{actionLabel}
    </button>
  </section>;
}
