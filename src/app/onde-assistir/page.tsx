import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onde Assistir — Copa360",
  description: "Saiba onde assistir aos jogos da FIFA World Cup 2026 no Brasil.",
};

const BROADCASTERS = [
  {
    name: "Globo",
    description: "Transmissão aberta para todo o Brasil",
    tag: "TV Aberta",
    url: "https://globoplay.globo.com/",
    color: "#E53E3E",
  },
  {
    name: "SporTV",
    description: "Canal por assinatura com cobertura completa",
    tag: "Por Assinatura",
    url: "https://sportv.globo.com/",
    color: "#3182CE",
  },
  {
    name: "CazéTV",
    description: "Streaming gratuito no YouTube e Twitch",
    tag: "Gratuito · Online",
    url: "https://www.youtube.com/@CazéTV",
    color: "#805AD5",
  },
  {
    name: "FIFA+",
    description: "Plataforma oficial da FIFA com jogos e conteúdo exclusivo",
    tag: "Gratuito · Online",
    url: "https://www.fifa.com/fifaplus/",
    color: "#C8A96B",
  },
];

export default function OndeAssistirPage() {
  return (
    <section className="px-4 md:px-12 pt-10 md:pt-16 pb-24">
      <div className="mb-10">
        <p className="mb-3 text-[9px] font-semibold tracking-[0.42em] uppercase text-[#C8A96B]/55">
          FIFA World Cup 2026
        </p>
        <h1
          className="font-bold leading-[0.95] tracking-[-0.04em] text-[#F3F4F6]"
          style={{ fontSize: "clamp(32px, 4vw, 56px)" }}
        >
          Onde Assistir
        </h1>
        <p className="mt-4 text-[15px] font-light leading-[1.7] text-[#6B7280] max-w-[440px]">
          Acompanhe todos os jogos da Copa do Mundo 2026 pelas plataformas oficiais.
        </p>
        <div className="mt-6 h-px bg-white/[0.06]" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-[960px]">
        {BROADCASTERS.map((b) => (
          <a
            key={b.name}
            href={b.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-4 bg-white/[0.03] border border-white/[0.07] rounded-[20px] p-6 hover:border-white/[0.14] hover:scale-[1.02] transition-all duration-200 no-underline"
          >
            {/* Color accent */}
            <div
              className="w-8 h-1 rounded-full opacity-70"
              style={{ backgroundColor: b.color }}
            />

            <div>
              <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#6B7280] mb-1.5">
                {b.tag}
              </p>
              <h2 className="text-[22px] font-extrabold tracking-[-0.03em] text-[#F3F4F6] mb-2">
                {b.name}
              </h2>
              <p className="text-[13px] font-light leading-[1.6] text-[#6B7280]">
                {b.description}
              </p>
            </div>

            <span
              className="mt-auto text-[11px] font-semibold tracking-[0.06em] uppercase transition-colors"
              style={{ color: b.color }}
            >
              Assistir ↗
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
