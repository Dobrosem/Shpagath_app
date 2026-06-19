import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UserRoleManager } from "@/components/user-role-manager";
import { PageHeader } from "@/components/ui";
import { getProfile, getProfiles } from "@/lib/data";
import { translator } from "@/lib/i18n";
import { canManageUsers } from "@/lib/roles";

export default async function SettingsUsersPage() {
  const profile = await getProfile();
  const t = translator(profile.locale);

  if (!canManageUsers(profile.role)) {
    return <>
      <PageHeader eyebrow={t("page.settings.title")} title={t("settings.users")} description={t("settings.usersDescription")} />
      <section className="metal-card p-6">
        <p className="text-sm text-zinc-500">{t("settings.adminOnly")}</p>
      </section>
    </>;
  }

  const people = await getProfiles();

  return <>
    <Link href="/settings" className="mb-5 inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-white">
      <ArrowLeft size={14} />{t("page.settings.title")}
    </Link>
    <PageHeader eyebrow={t("page.settings.title")} title={t("settings.users")} description={t("settings.usersDescription")} />
    <UserRoleManager people={people} locale={profile.locale} />
  </>;
}
