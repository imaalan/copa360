# Copa360

> A Copa do Mundo como você nunca viu.

Copa360 é uma plataforma editorial e premium para explorar a **FIFA World Cup 2026** — seleções, jogadores, estatísticas e histórias, com a profundidade de um veículo de jornalismo esportivo e a energia visual do futebol de alto nível.

---

## Objetivo

Transformar a experiência de explorar a Copa do Mundo em algo **moderno, inteligente e cinematográfico**.

A Copa de 2026 é histórica: 48 seleções, 3 países-sede (EUA, Canadá e México), o maior torneio da história. Copa360 existe para cobrir essa Copa com a visão de 360° que ela merece — não como um placar genérico, mas como uma plataforma de descoberta.

---

## O que estamos construindo

### Páginas

| Página | Status | Descrição |
|---|---|---|
| `/` — Home | 🔧 Em evolução | Hero com countdown, featured players e mosaico dinâmico de seleções |
| `/teams` | ✅ Concluído | Lista das 48 seleções com dados reais, busca e cards com logo |
| `/teams/[slug]` | ✅ Concluído | Perfil da seleção: elenco completo agrupado por posição |
| `/players` | ✅ Concluído | Explorador com busca, filtro por posição/time e paginação |
| `/players/[id]` | 🔜 Próximo | Perfil do jogador: foto, stats, time, próximos jogos |
| `/matches` | ✅ Concluído | 104 jogos com filtros por fase/grupo e status ao vivo |
| `/stats` | ✅ Concluído | Análises de elenco: idade, posição, distribuição por seleção |

### Funcionalidades-chave

- **Splash screen** imersiva com animação orbital — aparece uma vez por sessão
- **Countdown ao vivo** para 19 de junho de 2026 (abertura do torneio)
- **Featured players** dinâmicos — camisa 10 de BRA, FRA, ARG, ENG com link para perfil
- **Mosaico de seleções** com rotação automática — 6 aleatórias do pool de 48, troca a cada 8s com fade
- **Banco de dados** com 48 seleções, elencos completos, 104 jogos via football-data.org API
- **Design responsivo** com animações suaves e estética cinematográfica

---

## Decisões de produto (maio 2026)

### Home — Featured Players
- 4 cards: BRA, FRA, ARG, ENG
- Critério: jogador de camisa **10** do squad; fallback para primeiro atacante
- Clique navega para `/players/[id]`
- Dados reais do DB (foto, posição, time)

### Home — Mosaico de Seleções
- Pool: todas as 48 seleções do banco com logos oficiais
- **Shuffle no page load** (server-side) → 6 seleções aleatórias
- **Rotação client-side**: a cada 8s, 2 cards trocam com fade de 300ms
- Clique navega para `/teams/[tla]`
- Link "48 equipes" aponta para `/teams`

### `/players/[id]` — Perfil do Jogador
- Foto oficial + nome + número da camisa
- Posição · Nacionalidade · Idade
- Card da seleção com logo
- Próximos jogos do time (dados do banco)
- Slot "Stats da Copa" — placeholder elegante até o torneio começar

### Schema — Novos campos em `Player`
- `shirtNumber Int?` — número da camisa (via football-data.org API)
- `photo String?` — já existia no schema; seed atualizado para popular

### Atualização de dados
- Desenvolvimento: **re-seed manual** (`npm run seed`) a cada anúncio de convocação
- Produção: **Vercel Cron** rodando o seed diariamente até o início do torneio

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
| Deploy | Vercel (pendente aprovação final) |

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
│   │   ├── layout.tsx              # Layout global: nav, Splash, font Sora
│   │   ├── page.tsx                # Home: hero, featured players, mosaico dinâmico
│   │   ├── teams/
│   │   │   ├── page.tsx            # Lista das 48 seleções
│   │   │   └── [slug]/page.tsx     # Perfil da seleção + elenco
│   │   ├── players/
│   │   │   ├── page.tsx            # Explorador de jogadores
│   │   │   └── [id]/page.tsx       # Perfil do jogador (em construção)
│   │   ├── matches/page.tsx        # 104 jogos com filtros
│   │   ├── stats/page.tsx          # Análises e rankings
│   │   └── globals.css             # CSS tokens e reset
│   ├── components/
│   │   ├── Splash.tsx              # Overlay de entrada (sessionStorage-gated)
│   │   ├── CountdownTimer.tsx      # Countdown ao vivo para a abertura
│   │   ├── TeamsGrid.tsx           # Grid de seleções com busca
│   │   └── PlayersGrid.tsx         # Grid de jogadores com filtros
│   └── lib/
│       ├── prisma.ts               # Client Prisma singleton
│       └── football-api.ts         # Client football-data.org API
├── prisma/
│   ├── schema.prisma               # Schema: Team, Player, Match, Competition
│   └── seed.ts                     # Seed: 48 seleções + elencos + 104 jogos
├── design.md                       # Sistema de design canônico
└── copa360-prototype.html          # Protótipo HTML aprovado (referência visual)
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
- [x] Seed script: 48 seleções + elencos + 104 jogos
- [x] Página `/teams` com dados reais
- [x] Página `/teams/[slug]` — perfil + elenco completo
- [x] Página `/players` — explorador com filtros
- [x] Página `/matches` — calendário com filtros
- [x] Página `/stats` — análises de elenco
- [ ] Home: featured players com dados reais (camisa 10 de BRA/FRA/ARG/ENG)
- [ ] Home: mosaico dinâmico com rotação automática
- [ ] Schema: adicionar `shirtNumber` e popular `photo` no seed
- [ ] Página `/players/[id]` — perfil completo do jogador
- [ ] Vercel Cron para atualização diária do banco
- [ ] Deploy em produção (Vercel)

---

## Copa 2026

| Info | Detalhe |
|---|---|
| Abertura | 19 de junho de 2026 |
| Final | 19 de julho de 2026 |
| Sedes | EUA · Canadá · México |
| Seleções | 48 |
| Jogos | 104 |
