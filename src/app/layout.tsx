import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import Splash from "@/components/Splash";
import NavHeader from "@/components/NavHeader";

const sora = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Copa360 — Copa do Mundo 2026",
  description:
    "A Copa do Mundo como você nunca viu. Explore jogadores, seleções, estatísticas e histórias da Copa de 2026.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={sora.variable}>
      <body className="bg-[#111315] text-[#F3F4F6] font-sans min-h-screen">
        <Splash />
        <NavHeader />
        <main className="mx-auto max-w-[1440px]">{children}</main>
      </body>
    </html>
  );
}
