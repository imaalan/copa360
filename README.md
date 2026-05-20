# Copa360

> A Copa do Mundo como você nunca viu.

Copa360 é uma plataforma editorial e premium para explorar a **FIFA World Cup 2026** — seleções, jogadores, técnicos, estatísticas e histórias, com a profundidade de um veículo de jornalismo esportivo e a energia visual do futebol de alto nível.

![Copa360 preview](demo/preview.gif)

---

## Páginas

| Página | Status | Descrição |
|---|---|---|
| `/` — Home | ✅ | Splash screen, countdown ao vivo, featured players, mosaico dinâmico de seleções |
| `/teams` | ✅ | 48 seleções com busca por nome/TLA e cards com logo |
| `/teams/[slug]` | ✅ | Perfil da seleção: técnico com popup + elenco agrupado por posição |
| `/players` | ✅ | Explorador com busca, filtro por posição/time e paginação |
| `/players/[id]` | ✅ | Perfil do jogador: foto real, troféus, clube atual, stats |
| `/coaches/[id]` | ✅ | Perfil do técnico: carreira, conquistas, link para seleção |
| `/matches` | ✅ | 104 jogos com filtros por fase/grupo e badge de status |
| `/stats` | ✅ | Análises: distribuição por posição, idade média, tamanho dos elencos |

---

## Funcionalidades

- **Splash screen** imersiva com animação orbital — aparece uma vez por sessão
- **Countdown ao vivo** para 19 de junho de 2026 (abertura do torneio)
- **Featured players** — camisa 10 de BRA, FRA, ARG e ENG com link para perfil
- **Mosaico de seleções** com rotação automática — 6 aleatórias do pool de 48, troca a cada 8s com fade
- **PlayerPopup** com foto real, troféus, clube atual e stats, via TheSportsDB + football-data.org
- **CoachCard + CoachPopup** — técnico de cada seleção com modal de stats e link para perfil completo
- **Sistema de posições FIFA** — siglas canônicas (GK, CB, CM, ST...) com agrupamento em PT-BR
- **Mobile responsivo**: hamburger menu com overlay full-screen, bottom sheet animado (slide-up)
- **Banco completo**: 48 seleções, 1247+ jogadores, 48 técnicos, 104 jogos

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS 3 |
| Font | Sora (Google Fonts) |
| ORM | Prisma 5.22 |
| Banco | PostgreSQL (Neon) |
| APIs de dados | football-data.org v4 · TheSportsDB (free) · API-Football (free) |
| Testes E2E | Playwright |
| Deploy | Vercel |

---

## Segurança

Copa360 segue política **Zero Trust** para credenciais:

- `DATABASE_URL` e `FOOTBALL_DATA_API_KEY` armazenadas **exclusivamente** em `.env.local`
- `.env.local` e variantes cobertas pelo `.gitignore` — **nunca commitadas**
- Nenhuma chave hardcoded em código-fonte ou configurações
- Variáveis passadas ao servidor de testes via `process.env` (sem valores padrão reais)

---

## Estrutura do projeto

```
copa360/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Layout global: NavHeader, Splash, font Sora
│   │   ├── page.tsx                      # Home: hero, countdown, featured players, mosaico
│   │   ├── api/
│   │   │   ├── players/[id]/popup/       # Route Handler: dados enriquecidos do jogador
│   │   │   └── coaches/[id]/             # Route Handler: dados do técnico
│   │   ├── teams/
│   │   │   ├── page.tsx                  # Lista das 48 seleções
│   │   │   └── [slug]/page.tsx           # Perfil da seleção: técnico + elenco
│   │   ├── players/
│   │   │   ├── page.tsx                  # Explorador de jogadores
│   │   │   └── [id]/page.tsx             # Perfil do jogador
│   │   ├── coaches/
│   │   │   └── [id]/page.tsx             # Perfil do técnico
│   │   ├── matches/page.tsx              # 104 jogos com filtros
│   │   └── stats/page.tsx                # Análises e rankings
│   ├── components/
│   │   ├── NavHeader.tsx                 # Navbar responsiva + hamburger mobile
│   │   ├── Splash.tsx                    # Overlay de entrada (sessionStorage-gated)
│   │   ├── CountdownTimer.tsx            # Countdown ao vivo
│   │   ├── TeamMosaic.tsx                # Mosaico com rotação automática
│   │   ├── TeamsGrid.tsx                 # Grid de seleções com busca
│   │   ├── PlayersGrid.tsx               # Grid de jogadores com filtros e paginação
│   │   ├── MatchesView.tsx               # Lista de jogos com filtros por fase/grupo
│   │   ├── PlayerPopup.tsx               # Modal/bottom-sheet com dados enriquecidos
│   │   ├── SquadWithPopup.tsx            # Elenco da seleção + integração popup
│   │   ├── CoachCard.tsx                 # Card do técnico (abre CoachPopup)
│   │   └── CoachPopup.tsx                # Modal do técnico: stats + conquistas
│   └── lib/
│       ├── prisma.ts                     # Client Prisma singleton
│       ├── football-api.ts               # Client football-data.org API
│       └── positions.ts                  # Sistema de posições FIFA — fonte única
├── prisma/
│   ├── schema.prisma                     # Schema: Team, Player, Match, Coach, Competition
│   └── seed.ts                           # Seed: 48 seleções + elencos + 104 jogos
├── scripts/
│   ├── enrich-photos.ts                  # Fotos de jogadores em lote via TheSportsDB
│   ├── enrich-stats.ts                   # Stats (gols/assist/xG) via Understat
│   ├── enrich-names.ts                   # Normalização de nomes
│   ├── enrich-coaches.ts                 # Fotos + stats + troféus de técnicos
│   ├── seed-coaches.ts                   # Seed dos 48 técnicos (anúncios oficiais)
│   └── check-enrichment.ts              # Relatório de cobertura de fotos/stats
├── e2e/                                  # Testes Playwright
├── playwright.config.ts
└── design.md                             # Sistema de design canônico
```

---

## Rodando localmente

### Pré-requisitos

- Node.js 20+
- PostgreSQL (ou conta no [Neon](https://neon.tech))
- Chave da API [football-data.org](https://www.football-data.org) (free tier)

### Setup

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Preencher DATABASE_URL e FOOTBALL_DATA_API_KEY no .env.local

# 3. Criar tabelas no banco
npm run db:push

# 4. Popular com dados reais (48 seleções, elencos, 104 jogos)
npm run db:seed

# 5. Seed dos técnicos
npx tsx scripts/seed-coaches.ts

# 6. (Opcional) Enriquecer fotos e stats
npm run enrich:all

# 7. (Opcional) Enriquecer técnicos
npx tsx scripts/enrich-coaches.ts

# 8. Rodar o servidor
npm run dev
```

Acesse em [http://localhost:3000](http://localhost:3000).

---

## Scripts disponíveis

| Script | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run db:seed` | Popula banco com 48 seleções, elencos e 104 jogos |
| `npm run db:studio` | Prisma Studio — UI de banco de dados |
| `npm run db:push` | Aplica schema ao banco (sem migrations) |
| `npm run enrich:photos` | Fotos de jogadores em lote via TheSportsDB |
| `npm run enrich:stats` | Stats (gols/assist/jogos/xG) via Understat (top 5 ligas) |
| `npm run enrich:names` | Normalização de nomes dos jogadores |
| `npm run enrich:all` | Sequência completa: names → photos → stats |
| `npm run test:e2e` | Roda os testes Playwright |
| `npm run test:e2e:ui` | Playwright com UI interativa |
| `npm run typecheck` | Verificação de tipos TypeScript |

### Enriquecimento de fotos

```bash
npx tsx scripts/enrich-photos.ts                    # todos sem foto
npx tsx scripts/enrich-photos.ts --tlas=BRA,FRA     # seleções específicas
npx tsx scripts/enrich-photos.ts --limit=50         # primeiros 50
npx tsx scripts/enrich-photos.ts --dry-run          # preview, sem escrita
```

### Enriquecimento de stats

Busca gols, assistências, jogos e xG via [Understat](https://understat.com) (gratuito, sem chave). Cobre La Liga, Premier League, Bundesliga, Ligue 1 e Serie A.

```bash
npx tsx scripts/enrich-stats.ts                     # todos sem stats
npx tsx scripts/enrich-stats.ts --tlas=BRA,FRA      # seleções específicas
npx tsx scripts/enrich-stats.ts --dry-run           # preview, sem escrita
npx tsx scripts/enrich-stats.ts --force             # sobrescreve quem já tem stats
npx tsx scripts/enrich-stats.ts --season=2023       # temporada alternativa (padrão: 2024)
```

### Enriquecimento de técnicos

Busca fotos via TheSportsDB e stats/troféus via API-Football.

```bash
npx tsx scripts/enrich-coaches.ts
```

---

## Testes E2E

```bash
npm run test:e2e          # todos os testes, Chromium
npm run test:e2e:ui       # com UI visual do Playwright
npm run test:e2e:report   # relatório HTML do último run
```

Cobertura: home (splash, countdown, featured players, mosaico), navegação, `/teams`, `/teams/[slug]`, `/players`, `/players/[id]`, `/coaches/[id]`, `/matches`, `/stats`.

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

Fusão entre **PES 2013** (energia dos cards de jogador, TLA em destaque), **editorial premium** (Apple Sports, The Athletic, F1) e **broadcast esportivo** (cores nacionais, tipografia bold, composição cinematográfica).

O que **não** fazemos: estética gamer, neon, scanlines, #FFD700, escudos, bolas de futebol tradicionais.

---

## Roadmap

- [x] Design system e tokens
- [x] Splash screen com animação orbital
- [x] Countdown dinâmico ao vivo
- [x] Seed script: 48 seleções + elencos + 104 jogos
- [x] Página `/teams` com dados reais e busca
- [x] Página `/teams/[slug]` — perfil + elenco completo
- [x] Página `/players` — explorador com filtros e paginação
- [x] Página `/matches` — calendário com filtros por fase/grupo
- [x] Página `/stats` — análises de elenco por posição e idade
- [x] Home interativa: featured players, mosaico dinâmico, countdown
- [x] Página `/players/[id]` — perfil com foto real, troféus e clube
- [x] PlayerPopup: modal enriquecido via multi-API
- [x] Mobile responsivo: hamburger nav, bottom sheet, layouts adaptados
- [x] Script de enriquecimento de fotos em lote (TheSportsDB)
- [x] Script de enriquecimento de stats (Understat): top 5 ligas
- [x] Sistema de posições FIFA (`positions.ts`) — siglas canônicas + PT-BR
- [x] Técnicos: seed + enriquecimento + CoachCard + CoachPopup + `/coaches/[id]`
- [x] Testes E2E com Playwright
- [ ] CI/CD com GitHub Actions (PR gate + nightly schedule)
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
