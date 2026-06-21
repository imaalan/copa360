"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { label: "Seleções",      href: "/teams" },
  { label: "Jogadores",     href: "/players" },
  { label: "Jogos",         href: "/matches" },
  { label: "Estatísticas",  href: "/stats" },
  { label: "Onde Assistir", href: "/onde-assistir" },
];

export default function NavHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const close = useCallback(() => setOpen(false), []);

  // Close on route change
  useEffect(() => { close(); }, [pathname, close]);

  // Lock body scroll when overlay open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#111315]/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 md:px-12 py-5">
          <Link href="/" className="text-[18px] font-extrabold tracking-[-0.03em] no-underline text-[#F3F4F6]">
            COPA<span className="text-[#C8A96B]">360</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-9">
            <ul className="flex gap-9 list-none">
              {NAV_LINKS.map(({ label, href }) => (
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
            <a
              href="https://7a0.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#C8A96B]/12 border border-[#C8A96B]/30 text-[10px] font-bold tracking-[0.1em] uppercase text-[#C8A96B] hover:bg-[#C8A96B]/20 transition-colors no-underline"
            >
              Brincar de Técnico ↗
            </a>
          </nav>

          {/* Hamburger button (mobile only) */}
          <button
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-[5px]"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <span className="w-6 h-[1.5px] bg-[#F3F4F6] rounded-full" />
            <span className="w-6 h-[1.5px] bg-[#F3F4F6] rounded-full" />
            <span className="w-4 h-[1.5px] bg-[#C8A96B] rounded-full self-start" />
          </button>
        </div>
      </header>

      {/* Full-screen overlay menu */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-[#111315] flex flex-col"
          style={{ animation: "fadeIn 180ms ease both" }}
        >
          {/* Header row */}
          <div className="flex items-center justify-between px-4 py-5 border-b border-white/[0.06]">
            <Link href="/" className="text-[18px] font-extrabold tracking-[-0.03em] no-underline text-[#F3F4F6]">
              COPA<span className="text-[#C8A96B]">360</span>
            </Link>
            <button
              onClick={close}
              className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-white/60 hover:text-white transition-colors"
              aria-label="Fechar menu"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Links */}
          <nav className="flex-1 flex flex-col justify-center items-center gap-2 px-6">
            {NAV_LINKS.map(({ label, href }, i) => (
              <Link
                key={label}
                href={href}
                onClick={close}
                className="w-full text-center py-5 text-[28px] font-bold tracking-[-0.03em] text-[#F3F4F6] hover:text-[#C8A96B] transition-colors no-underline border-b border-white/[0.05] last:border-0"
                style={{ animationDelay: `${i * 60}ms`, animation: "slideUp 220ms ease both" }}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Pill mobile */}
          <div className="pb-10 flex justify-center">
            <a
              href="https://7a0.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#C8A96B]/12 border border-[#C8A96B]/30 text-[11px] font-bold tracking-[0.1em] uppercase text-[#C8A96B] no-underline"
            >
              Brincar de Técnico ↗
            </a>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
