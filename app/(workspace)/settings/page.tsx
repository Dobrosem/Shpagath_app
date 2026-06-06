import { LanguageSwitcher } from "@/components/language-switcher";
import { PageHeader } from "@/components/ui";
import { getProfile, getProfiles } from "@/lib/data";
import { translateLiteral, translator } from "@/lib/i18n";
import { initials } from "@/lib/utils";

export default async function SettingsPage() {
  const [profile, people] = await Promise.all([getProfile(), getProfiles()]);
  const t = translator(profile.locale);
  return <>
    <PageHeader eyebrow={profile.locale === "en" ? "System" : "Система"} title={t("page.settings.title")} description={t("settings.description")} />
    <div className="grid gap-5 xl:grid-cols-[.75fr_1.25fr]">
      <section className="metal-card p-6">
        <h2 className="font-display text-lg uppercase text-white">{t("settings.language")}</h2>
        <p className="mb-5 mt-2 text-xs leading-5 text-zinc-600">{t("settings.languageDescription")}</p>
        <LanguageSwitcher />
      </section>
      <section className="metal-card p-6">
        <h2 className="font-display text-lg uppercase text-white">{t("settings.team")}</h2>
        <div className="mt-4 divide-y divide-white/[.06]">{people.map((person) => <div key={person.id} className="flex items-center gap-3 py-4"><span className="grid h-9 w-9 place-items-center rounded-full bg-zinc-800 text-[10px]">{initials(person.full_name)}</span><div><p className="text-sm text-zinc-200">{person.full_name}</p><p className="mt-1 text-[10px] text-zinc-600">{person.email}</p></div><span className="badge ml-auto border-white/10 bg-white/[.03] text-zinc-400">{translateLiteral(profile.locale, person.role)}</span></div>)}</div>
      </section>
    </div>
  </>;
}
