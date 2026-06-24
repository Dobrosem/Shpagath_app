import { AppShell } from "@/components/app-shell";
import { I18nProvider } from "@/components/i18n-provider";
import { getProfile } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  return <I18nProvider locale={profile.locale}><AppShell profile={profile}>{children}</AppShell></I18nProvider>;
}
