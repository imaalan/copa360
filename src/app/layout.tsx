import type { Metadata } from "next";
import { Sora } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import Splash from "@/components/Splash";

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

        <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#111315]/88 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between px-12 py-5">
            <Link href="/" className="text-[18px] font-extrabold tracking-[-0.03em] no-underline text-[#F3F4F6]">
              COPA<span className="text-[#C8A96B]">360</span>
            </Link>
            <nav>
              <ul className="flex gap-9 list-none">
                {[
                  { label: "Seleções",     href: "/teams" },
                  { label: "Jogadores",    href: "/players" },
                  { label: "Jogos",        href: "/matches" },
                  { label: "Estatísticas", href: "/stats" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#6B7280] hover:text-[#C8A96B] transition-colors duration-150 no-underline"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px]">{children}</main>
      </body>
    </html>
  );
}
