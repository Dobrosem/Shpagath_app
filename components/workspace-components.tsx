import { redirect } from "next/navigation";
import { Check, Circle, ExternalLink, MessageSquare, Shield } from "lucide-react";
import type { Material, Profile, Role } from "@/lib/types";
import { getProfile } from "@/lib/data";
import { isProfileSessionUnavailable } from "@/lib/roles";
import { StatusBadge } from "./ui";

export async function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return children;
}

export function RoleGuard({ profile, allow, children, fallback = null }: { profile: Profile; allow: Role[]; children: React.ReactNode; fallback?: React.ReactNode }) {
  if (isProfileSessionUnavailable(profile)) {
    return <section className="metal-card p-6 text-sm text-zinc-500">
      {profile.locale === "en"
        ? "Could not confirm your session. Refresh the page."
        : "Не удалось подтвердить сессию. Обновите страницу."}
    </section>;
  }
  return allow.includes(profile.role) ? children : fallback;
}

export function Checklist({ items }: { items: { id: string; title: string; done: boolean }[] }) {
  return <div className="metal-card divide-y divide-white/[.055] px-4">
    {items.map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-3 py-3 text-sm text-zinc-300">
      <input type="checkbox" defaultChecked={item.done} className="sr-only" />
      <span className="grid h-5 w-5 place-items-center rounded border border-white/10 bg-black/20">{item.done ? <Check size={12} className="text-emerald-400" /> : <Circle size={11} className="text-zinc-700" />}</span>
      <span className={item.done ? "text-zinc-600 line-through" : ""}>{item.title}</span>
    </label>)}
  </div>;
}

export function MaterialList({ materials }: { materials: Material[] }) {
  return <div className="table-shell divide-y divide-white/[.055]">
    {materials.map((material) => <a key={material.id} href={material.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 hover:bg-white/[.02]">
      <div className="min-w-0 flex-1"><p className="truncate text-sm text-zinc-200">{material.title}</p><p className="mt-1 text-[10px] text-zinc-600">{material.type} · {material.version}</p></div>
      <StatusBadge status={material.status} /><ExternalLink size={14} className="text-zinc-600" />
    </a>)}
  </div>;
}

export function CommentThread({ comments }: { comments: { id: string; author: string; text: string; at: string }[] }) {
  return <div className="metal-card p-5"><div className="mb-4 flex items-center gap-2 text-sm text-zinc-300"><MessageSquare size={15} />Комментарии</div>
    <div className="space-y-4">{comments.map((comment) => <div key={comment.id}><p className="text-xs text-zinc-400"><b className="text-zinc-200">{comment.author}</b> · {comment.at}</p><p className="mt-1 text-sm leading-6 text-zinc-500">{comment.text}</p></div>)}</div>
  </div>;
}

export function ActivityFeed({ items }: { items: { id: string; text: string; at: string }[] }) {
  return <div className="metal-card divide-y divide-white/[.055] px-5">{items.map((item) => <div key={item.id} className="py-4"><p className="text-xs text-zinc-300">{item.text}</p><p className="mt-1 text-[10px] text-zinc-700">{item.at}</p></div>)}</div>;
}

export function EntityAccessManager({ grants }: { grants: { id: string; user: string; entity: string; level: "read" | "write" }[] }) {
  return <div className="metal-card p-5"><div className="mb-4 flex items-center gap-2"><Shield size={16} className="text-zinc-500" /><h3 className="font-display uppercase text-white">Точечный доступ</h3></div>
    <div className="divide-y divide-white/[.055]">{grants.map((grant) => <div key={grant.id} className="flex items-center py-3 text-xs"><span className="text-zinc-300">{grant.user}</span><span className="ml-2 text-zinc-700">· {grant.entity}</span><span className="badge ml-auto border-white/10 text-zinc-400">{grant.level}</span></div>)}</div>
  </div>;
}

// Named aliases keep the public component surface aligned with the product spec.
export { AppShell as Layout, AppShell as Sidebar, AppShell as MobileNav } from "./app-shell";
