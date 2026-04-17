import Link from "next/link";

const features = [
  {
    title: "Seleções",
    description: "Todas as 48 equipes da Copa 2026",
    href: "/teams",
    icon: "⚽",
  },
  {
    title: "Jogadores",
    description: "Elencos completos de cada seleção",
    href: "/players",
    icon: "👤",
  },
  {
    title: "Jogos ao Vivo",
    description: "Placares em tempo real",
    href: "/matches",
    icon: "📊",
  },
  {
    title: "Estatísticas",
    description: "Dados e estatísticas das selecões",
    href: "/stats",
    icon: "📈",
  },
];

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="text-center space-y-4">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
          Copa do Mundo 2026
        </h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Tudo o que você precisa saber sobre a Copa do Mundo nos Estados Unidos, Canadá e México
        </p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature) => (
          <Link
            key={feature.href}
            href={feature.href}
            className="group p-6 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-primary-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/10"
          >
            <span className="text-4xl mb-4 block">{feature.icon}</span>
            <h3 className="text-xl font-semibold mb-2 group-hover:text-primary-400 transition-colors">
              {feature.title}
            </h3>
            <p className="text-gray-400 text-sm">{feature.description}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 p-8 text-center">
        <h3 className="text-2xl font-bold mb-4">Em breve</h3>
        <p className="text-gray-400 mb-6">
          Mais funcionalidades serão adicionadas conforme a Copa se aproxima
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <span className="px-4 py-2 bg-primary-500/20 text-primary-400 rounded-full text-sm">
            Ao Vivo
          </span>
          <span className="px-4 py-2 bg-accent-500/20 text-accent-400 rounded-full text-sm">
            Estatísticas
          </span>
          <span className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-full text-sm">
            Previsões
          </span>
        </div>
      </section>
    </div>
  );
}