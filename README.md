# Copa360

> A Copa do Mundo como você nunca viu.

Copa360 é uma plataforma editorial e premium para explorar a **FIFA World Cup 2026** — seleções, jogadores, estatísticas e histórias, com a profundidade de um veículo de jornalismo esportivo e a energia visual do futebol de alto nível.

---

## Objetivo

Transformar a experiência de explorar a Copa do Mundo em algo **moderno, inteligente e cinematográfico**.

A Copa de 2026 é histórica: 48 seleções, 3 países-sede (EUA, Canadá e México), o maior torneio da história. Copa360 existe para cobrir essa Copa com a visão de 360° que ela merece — não como um placar genérico, mas como uma plataforma de descoberta.

---

## O que estamos construindo

### Páginas planejadas

| Página | Status | Descrição |
|---|---|---|
| `/` — Home | ✅ Concluído | Hero com countdown dinâmico, cards de jogadores (estilo PES), mosaico de seleções |
| `/teams` | 🔜 Próximo | Lista das 48 seleções com dados reais |
| `/teams/[slug]` | 🔜 Planejado | Perfil completo da seleção: elenco, história, estatísticas |
| `/players` | 🔜 Planejado | Explorador de jogadores com cards estilo PES 2013 |
| `/matches` | 🔜 Planejado | Calendário de jogos com countdown por partida |
| `/stats` | 🔜 Planejado | Estatísticas e rankings da competição |

### Funcionalidades-chave

- **Splash screen** imersiva com animação orbital — aparece uma vez por sessão
- **Countdown ao vivo** para 19 de junho de 2026 (abertura do torneio)
- **Cards de jogadores** estilo PES 2013 com barras de atributos (VEL / FIN / DRI / PAS)
- **Mosaico de seleções** broadcast-style com cores nacionais, foto e TLA em destaque
- **Banco de dados** com todas as 48 seleções e elencos via football-data.org API
- **Design responsivo** com animações suaves e estética cinematográfica

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS 3 |
| Font | Sora (Google Fonts) |
| ORM | Prisma |
| Banco | PostgreSQL (Neon) |
| API de dados | football-data.org v4 |
| Deploy | — |

---

## Design System

Copa360 segue um sistema de design próprio documentado em [`design.md`](./design.md).

### Tokens principais

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#111315` | Fundo principal |
| `--bg-alt` | `#0B1020` | Fundo alternativo / splash |
| `--gold` | `#C8A96B` | Accent premium |
| `--text` | `#F3F4F6` | Texto principal |
| `--text-muted` | `#6B7280` | Texto secundário |

### Direção visual

A estética é uma fusão entre:

- **PES 2013** — energia dos cards de jogador, barras de atributo, TLA em destaque
- **Editorial premium** — Apple Sports, The Athletic, F1, Netflix Sports Docs
- **Broadcast esportivo** — cores nacionais, tipografia bold, composição cinematográfica

O que **não** fazemos: estética gamer, neon, scanlines, #FFD700, escudos, bolas de futebol tradicionais.

---

## Estrutura do projeto

```
copa360/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Layout global: nav, Splash, font Sora
│   │   ├── page.tsx            # Home page
│   │   └── globals.css         # CSS tokens e reset
│   ├── components/
│   │   ├── Splash.tsx          # Overlay de entrada (sessionStorage-gated)
│   │   └── CountdownTimer.tsx  # Countdown ao vivo para a abertura
│   └── lib/
│       ├── prisma.ts           # Client Prisma singleton
│       └── football-api.ts     # Client football-data.org API
├── prisma/
│   └── schema.prisma           # Schema: Team, Player, Match, Competition, GroupStanding
├── design.md                   # Sistema de design canônico
└── copa360-prototype.html      # Protótipo HTML aprovado (referência visual)
```

---

## Rodando localmente

### Pré-requisitos

- Node.js 20+
- PostgreSQL (ou conta no [Neon](https://neon.tech))
- Chave da API [football-data.org](https://www.football-data.org)

### Setup

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Preencher DATABASE_URL e FOOTBALL_DATA_API_KEY no .env.local

# 3. Criar tabelas no banco
npm run db:push

# 4. Seed com dados reais (em desenvolvimento)
# npm run db:seed

# 5. Rodar o servidor
npm run dev
```

Acesse em [http://localhost:3000](http://localhost:3000).

---

## Dados

Copa360 usa a [football-data.org API v4](https://www.football-data.org) para dados de seleções, jogadores e partidas. Os dados são persistidos em PostgreSQL via Prisma para evitar rate limiting e garantir performance.

O seed script (em desenvolvimento) vai popular as 48 seleções da Copa 2026 e seus elencos completos.

---

## Roadmap

- [x] Design system e tokens
- [x] Splash screen com animação orbital
- [x] Countdown dinâmico
- [x] Home page com cards de jogadores e mosaico de seleções
- [ ] `.env.local` com credenciais reais
- [ ] Seed script para as 48 seleções
- [ ] Página `/teams` com dados reais
- [ ] Página `/teams/[slug]`
- [ ] Página `/players`
- [ ] Página `/matches`
- [ ] Deploy em produção

---

## Copa 2026

| Info | Detalhe |
|---|---|
| Abertura | 19 de junho de 2026 |
| Final | 19 de julho de 2026 |
| Sedes | EUA · Canadá · México |
| Seleções | 48 |
| Jogos | 104 |
