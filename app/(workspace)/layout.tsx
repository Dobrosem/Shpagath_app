import { AppShell } from "@/components/app-shell";
import { getProfile } from "@/lib/data";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  return <AppShell profile={profile}>{children}</AppShell>;
}
