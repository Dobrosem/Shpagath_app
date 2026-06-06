import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saphath Workspace",
  description: "Закрытый рабочий портал музыкальной группы Saphath",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
