import CountdownTimer from "@/components/CountdownTimer";

const TEAMS = [
  { tla: "BRA", name: "Brasil",      bg: "#005f2e" },
  { tla: "ARG", name: "Argentina",   bg: "#2e78b5" },
  { tla: "FRA", name: "França",      bg: "#002395" },
  { tla: "POR", name: "Portugal",    bg: "#8b0000" },
  { tla: "ENG", name: "Inglaterra",  bg: "#ba0c2f" },
  { tla: "ESP", name: "Espanha",     bg: "#aa151b" },
];

const PLAYERS = [
  { name: "Vinicius Jr.", pos: "ATA · BRA", stats: { VEL: 95, FIN: 88, DRI: 92, PAS: 78 } },
  { name: "Mbappé",       pos: "ATA · FRA", stats: { VEL: 97, FIN: 91, DRI: 89, PAS: 80 } },
  { name: "Bellingham",   pos: "MEI · ENG", stats: { VEL: 82, FIN: 84, DRI: 86, PAS: 88 } },
  { name: "Pedri",        pos: "MEI · ESP", stats: { VEL: 78, FIN: 76, DRI: 90, PAS: 93 } },
];

export default function Home() {
  return (
    <>
      {/* ── HERO + COUNTDOWN ── */}
      <section className="px-12 pt-24 pb-16">
        <p className="mb-5 text-[9px] font-semibold tracking-[0.42em] uppercase text-[#C8A96B]/55">
          Contagem regressiva · FIFA World Cup 2026
        </p>
        <h1
          className="font-bold leading-[0.95] tracking-[-0.04em] text-[#F3F4F6]"
          style={{ fontSize: "clamp(40px, 6vw, 72px)" }}
        >
          A Copa do Mundo
          <br />
          <em className="not-italic text-[#C8A96B]">como você nunca viu.</em>
        </h1>
        <p className="mt-5 max-w-[480px] text-base font-light leading-[1.7] text-[#6B7280]">
          Explore jogadores, seleções, estatísticas
          <br />e histórias da Copa de 2026.
        </p>

        <div className="mt-12">
          <p className="mb-5 text-[9px] font-semibold tracking-[0.38em] uppercase text-white/20">
            Abertura · 19 de junho de 2026
          </p>
          <CountdownTimer />
        </div>
      </section>

      {/* ── DIVIDER ── */}
      <div className="mx-12 mb-[52px] h-px bg-white/[0.06]" />

      {/* ── FEATURED PLAYERS ── */}
      <section className="px-12 pb-16">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/70">
            Jogadores em Destaque
          </h2>
          <a href="#" className="text-[11px] font-semibold text-[#C8A96B]/70 hover:text-[#C8A96B] transition-colors no-underline">
            Ver todos →
          </a>
        </div>

        <div className="grid grid-cols-4 gap-2.5 max-w-[860px]">
          {PLAYERS.map((p, i) => (
            <div
              key={i}
              className="bg-white/[0.03] border border-white/[0.07] rounded-[28px] p-5 cursor-pointer hover:border-[#C8A96B]/30 transition-colors"
            >
              <div className="aspect-square rounded-[14px] bg-white/[0.05] flex items-center justify-center text-[9px] font-semibold tracking-widest uppercase text-white/20 mb-3.5">
                Foto
              </div>
              <div className="text-[14px] font-bold tracking-[-0.01em] text-[#F3F4F6]">
                {p.name}
              </div>
              <div className="text-[10px] text-[#6B7280] mb-3.5">{p.pos}</div>
              <div className="flex flex-col gap-1.5">
                {Object.entries(p.stats).map(([k, v]) => (
                  <div key={k} className="grid items-center gap-2" style={{ gridTemplateColumns: "28px 1fr 24px" }}>
                    <span className="text-[8px] font-bold uppercase text-[#6B7280]">{k}</span>
                    <div className="h-[3px] bg-white/[0.07] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#C8A96B] rounded-full"
                        style={{ width: `${v}%`, opacity: 0.85 }}
                      />
                    </div>
                    <span className="text-[9px] font-bold text-right text-[#C8A96B] tabular-nums">
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── DIVIDER ── */}
      <div className="mx-12 mb-[52px] h-px bg-white/[0.06]" />

      {/* ── TEAM MOSAIC ── */}
      <section className="px-12 pb-20">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/70">
            Seleções
          </h2>
          <a href="#" className="text-[11px] font-semibold text-[#C8A96B]/70 hover:text-[#C8A96B] transition-colors no-underline">
            48 equipes →
          </a>
        </div>

        <div className="grid grid-cols-3 gap-2.5 max-w-[860px]">
          {TEAMS.map((t, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-[16px] cursor-pointer hover:scale-[1.025] transition-transform"
              style={{ aspectRatio: "4/3" }}
            >
              {/* BG */}
              <div className="absolute inset-0" style={{ background: t.bg }} />

              {/* Circular photo placeholder */}
              <div
                className="absolute rounded-full overflow-hidden bg-white/[0.08]"
                style={{ width: "72%", aspectRatio: "1", top: "-16%", left: "50%", transform: "translateX(-50%)" }}
              />

              {/* Gradient */}
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(180deg, transparent 35%, ${t.bg} 68%)` }}
              />

              {/* Gold hover accent */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C8A96B] opacity-0 group-hover:opacity-60 transition-opacity" />

              {/* Country name */}
              <span className="absolute bottom-3.5 left-3.5 text-[9px] font-semibold tracking-[0.14em] uppercase text-white/48">
                {t.name}
              </span>

              {/* TLA */}
              <span
                className="absolute font-extrabold text-white tracking-[-0.05em] leading-none"
                style={{
                  bottom: -4,
                  right: 10,
                  fontSize: "clamp(46px, 8vw, 74px)",
                  textShadow: "0 2px 24px rgba(0,0,0,0.45)",
                }}
              >
                {t.tla}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="mx-12 border-t border-white/[0.06] py-7 flex items-center justify-between">
        <span className="text-[14px] font-extrabold tracking-[-0.02em] text-white/18">
          COPA<span className="text-[#C8A96B]/25">360</span>
        </span>
        <span className="text-[10px] text-white/12 tracking-[0.08em]">
          FIFA World Cup 2026 &nbsp;·&nbsp; EUA · CANADÁ · MÉXICO
        </span>
      </footer>
    </>
  );
}
