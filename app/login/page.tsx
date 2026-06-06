import { LockKeyhole, ShieldCheck } from "lucide-react";
import { signIn } from "@/app/actions";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const loginErrors: Record<string, string> = {
  supabase_not_configured: "Supabase не настроен",
  invalid_credentials: "Неверный email или пароль",
  missing_credentials: "Введите email и пароль",
  unknown: "Неизвестная ошибка входа",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error: errorCode } = await searchParams;
  const error = errorCode
    ? loginErrors[errorCode] ?? loginErrors.unknown
    : null;
  const supabaseConfigured = isSupabaseConfigured();
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#060606] p-4">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,.075),transparent_38%)]" />
    <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px bg-gradient-to-b from-white/10 via-transparent to-transparent" />
    <section className="relative w-full max-w-sm">
      <div className="mb-9 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center border border-white/15 bg-zinc-950 font-display text-4xl text-white shadow-2xl">S</div>
        <h1 className="mt-5 font-display text-3xl font-semibold uppercase tracking-[.24em] text-white">Saphath</h1>
        <p className="mt-1 text-[9px] uppercase tracking-[.35em] text-zinc-600">Закрытый рабочий портал</p>
      </div>
      <form action={signIn} className="metal-card p-6">
        <div className="mb-6 flex items-center gap-3 border-b border-white/[.06] pb-5"><LockKeyhole size={17} className="text-zinc-500" /><div><p className="text-sm text-zinc-200">Вход в систему</p><p className="mt-0.5 text-[10px] text-zinc-600">Только для участников команды</p></div></div>
        {error && <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}
        <label><span className="label">Email</span><input className="field" name="email" type="email" required placeholder="name@saphath.ru" /></label>
        <label className="mt-4 block"><span className="label">Пароль</span><input className="field" name="password" type="password" required placeholder="••••••••" /></label>
        <button className="button-primary mt-6 w-full">Войти</button>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-[9px] uppercase tracking-widest text-zinc-700"><ShieldCheck size={12} /> Доступ по приглашению</p>
      </form>
      {!supabaseConfigured && <p className="mt-4 text-center text-[10px] text-amber-700">Добавьте настройки Supabase в .env.local</p>}
    </section>
  </main>;
}
