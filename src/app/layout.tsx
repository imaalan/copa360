import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrepCopa - Copa do Mundo 2026",
  description: "Acompanhe tudo sobre a Copa do Mundo 2026: Seleções, Jogadores, Jogos ao Vivo e Estatísticas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#0a0a0a] text-white">
        <header className="border-b border-gray-800">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-primary-500">PrepCopa 2026</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}