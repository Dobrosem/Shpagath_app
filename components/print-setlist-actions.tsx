"use client";

import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";

export function PrintSetlistActions({
  backHref,
  backLabel,
  printLabel,
  pdfHref,
  pdfLabel,
}: {
  backHref: string;
  backLabel: string;
  printLabel: string;
  pdfHref?: string;
  pdfLabel?: string;
}) {
  return <div className="print:hidden mb-6 flex flex-wrap items-center justify-between gap-3">
    <Link
      href={backHref}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-xs font-medium text-zinc-800 transition hover:bg-zinc-100"
    >
      <ArrowLeft size={14} />{backLabel}
    </Link>
    <div className="flex flex-wrap items-center gap-2">
      {pdfHref && pdfLabel && <a
        href={pdfHref}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-xs font-medium text-zinc-800 transition hover:bg-zinc-100"
      >
        <Download size={14} />{pdfLabel}
      </a>}
      <button
        type="button"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-xs font-semibold text-white transition hover:bg-zinc-800"
        onClick={() => window.print()}
      >
        <Printer size={14} />{printLabel}
      </button>
    </div>
  </div>;
}
