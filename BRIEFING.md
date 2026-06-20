# Copa360 — Briefing do Projeto

Copa do Mundo 2026 — app Next.js com Prisma + Neon PostgreSQL + Vercel.
Dados de times, jogadores, partidas e estatísticas da FIFA World Cup 2026.

## Stack
- Next.js 15 (App Router, ISR revalidate:3600)
- Prisma 5 + Neon PostgreSQL
- Tailwind CSS
- football-data.org API (dados de times/jogadores/partidas)
- Vercel deploy (branch master → auto-deploy)

## Scripts relevantes
- `npm run db:seed` — seed completo (times + jogadores + partidas)
- `npm run sync:squads` — normaliza posições dos jogadores
- `npm run cleanup:squads` — remove jogadores órfãos do banco
- `node --env-file=.env node_modules/tsx/dist/cli.cjs <script>` — rodar scripts com .env

## Problema de TLS (Node 24)
`npm run db:seed` falha com TLS se rodar direto com `npx tsx`.
Solução: `node --env-file=.env node_modules/tsx/dist/cli.cjs prisma/seed.ts`
O seed.ts já foi corrigido para usar `https` nativo ao invés de `fetch`.

---

## ESTADO DA SESSÃO — 2026-06-20

### Decisões confirmadas (Spec 002 — Onde Assistir + Brincar de Técnico)

**Feature 1 — Onde Assistir:**
- YouTube Data API com API key simples (sem OAuth) — canal CazéTV é público
- Matching: `scheduledStartTime` ±2h + validação por nomes dos times com regex PT-BR/EN
- Schema: `streamingLinks Json?` no modelo `Match` — array `[{ platform, url }]`
- Botão no MatchCard: "▶ Assistir ao vivo" (TIMED/IN_PLAY/PAUSED) | "▶ Rever jogo" (FINISHED) | sem botão (POSTPONED)
- Sync: `syncStreamingLinks()` chamado dentro do cron de scores (`/api/cron/scores`) a cada 30min
- Página `/onde-assistir`: estática, cards de Globo + SporTV + CazéTV + FIFA+ com links externos
- NavHeader: link "Onde Assistir" → `/onde-assistir` (desktop + mobile hamburger)

**Feature 2 — Brincar de Técnico:**
- NavHeader: pill/botão visualmente destacado com `↗`, abre `https://7a0.com.br/` em nova aba
- Home page: card entre FEATURED PLAYERS e TEAM MOSAIC com copy exato:
  - Título: "Role o dado."
  - Subtítulo: "Monte sua seleção dos sonhos"
  - Corpo: "Role o dado: sai uma seleção e uma Copa. Escale um craque que esteve lá, complete os 11 e simule — seu time faz 7 a 0?"
  - CTA → `https://7a0.com.br/` em nova aba

**Feature 3 — Tabela de Classificação: POSTERGADA** (decidido pelo usuário)

**Env var nova necessária:** `YOUTUBE_API_KEY` (`.env`, `.env.example`, Vercel, GitHub Actions)

### Progresso (Brothers Protocol)
- ✅ Spec criada: `specs/002-onde-assistir-tecnico.md`
- ✅ RED confirmado (2026-06-20 19:35 BRT):
  - Unit: `src/__tests__/streaming-sync.test.ts` — FAIL (Cannot find module)
  - E2E: `e2e/onde-assistir.spec.ts` (3 testes) + `e2e/brincar-tecnico.spec.ts` (4 testes) — 7 FAILING
- ✅ Commits: 1bc1e8e (spec), 3c501b3 (testes RED v1), a2597b5 (checkpoint), c612ece (RED final)
- 🔄 Estado atual: RED_CONFIRMED → aguardando GREEN backend (Gemini)

### Próximo passo
**Despachar Gemini para GREEN backend** com este prompt exato:

```
TAREFA: Implementar backend da spec 002 — Onde Assistir (streaming sync via YouTube API).

SPEC: specs/002-onde-assistir-tecnico.md (colar seções relevantes abaixo)

CONTEXTO ATUAL DO PROJETO:
- Next.js 15, Prisma 5 + Neon PostgreSQL, TypeScript
- schema.prisma: modelo Match tem campos utcDate, status, homeTeam, awayTeam. Precisa adicionar streamingLinks Json?
- football-api.ts em src/lib/ já existe — padrão: classe com métodos async que retornam dados
- cron de scores: src/app/api/cron/scores/route.ts — já faz updates paralelos com Promise.all, usa prisma direto, autenticado por CRON_SECRET header
- Env var nova: YOUTUBE_API_KEY (adicionar em .env.example, o valor real já está no .env)
- Canal CazéTV no YouTube: encontrar o channelId correto pesquisando publicamente

ARQUIVOS (whitelist):
- prisma/schema.prisma (adicionar streamingLinks Json? ao modelo Match)
- src/lib/youtube-api.ts (CRIAR — cliente YouTube Data API v3)
- src/lib/streaming-sync.ts (CRIAR — matching por data±2h + regex PT-BR/EN + upsert)
- src/app/api/cron/scores/route.ts (adicionar chamada syncStreamingLinks() após updates de placar)
- .env.example (adicionar YOUTUBE_API_KEY=)
- prisma/migrations/*/migration.sql (auto-gerado pelo prisma migrate dev)

BUDGET: 5 arquivos, ~200 linhas

TESTES RED (não alterar):
- src/__tests__/streaming-sync.test.ts — importa matchStreamToGame de @/lib/streaming-sync e funções de @/lib/youtube-api
- Os testes esperam: matchStreamToGame(stream, matches) retorna null ou Match; youtube-api exporta função que retorna array vazio em erro

SUCESSO: npm test -- --testPathPattern=streaming-sync VERDE (todos passando)
npx tsc --noEmit sem erros

PROIBIDO: alterar testes RED, modificar componentes frontend, modificar NavHeader/MatchesView/page.tsx
```

Depois do Gemini: despachar OpenCode para GREEN frontend (NavHeader + MatchCard + /onde-assistir + home card).

### Whitelist frontend (OpenCode — próxima etapa após Gemini)
- `src/components/NavHeader.tsx` — link "Onde Assistir" + pill "Seja Técnico" para 7a0.com.br
- `src/components/MatchesView.tsx` — botão Assistir no MatchCard; streamingLinks no tipo Match
- `src/app/matches/page.tsx` — incluir streamingLinks no prisma.match.findMany
- `src/app/onde-assistir/page.tsx` — CRIAR — 4 broadcaster cards estáticos
- `src/app/page.tsx` — card 7a0 entre FEATURED PLAYERS e TEAM MOSAIC

### Estado do banco (2026-06-20)
- Partidas: 104 jogos da Copa 2026, alguns já com placares (cron de 30min ativo)
- streamingLinks: campo ainda não existe (pendente migration do Gemini)
- GroupStanding: modelo existe no schema mas sem dados (feature postergada)

---

## ESTADO DA SESSÃO — 2026-06-08

### Decisões confirmadas
- Seed usa `upsert` por `externalId` — jogadores sem externalId são orphans
- Seed agora limpa orphans por time após cada upsert (deleteMany de externalIds fora do elenco atual)
- Posições são armazenadas como siglas canônicas (GK, DEF, MID, FWD) — seed usa `normPosition()`
- football-data.org retorna apenas 4 posições genéricas (Goalkeeper/Defence/Midfield/Offence)
- Para sub-posições granulares (CB, RB, LB, CDM, etc.) precisamos de outro fonte

### Progresso
- ✅ Seed executado com dados Copa 2026: 48 seleções, 1249 jogadores, 104 partidas
- ✅ 317 jogadores órfãos removidos (46 seleções afetadas, KSA pior com 42)
- ✅ seed.ts corrigido: TLS (https nativo), cleanup de orphans por time, normPosition() nas posições
- ✅ cleanup-squads.ts criado como script standalone
- ✅ 1249 jogadores com posições normalizadas: GK/DEF/MID/FWD via sync-squads
- ✅ Commits: 34a06f3 (seed fix + cleanup), 3d6a86a (normPosition no seed)
- ❌ Push ainda não feito (site Vercel ainda com cache antigo)
- 🔄 Scraper de sub-posições granulares: PENDENTE

### Próximo passo
1. `git push` para limpar cache ISR do Vercel e publicar todas as correções
2. Construir scraper de posições granulares via **Transfermarkt** (Sofascore e Flashscore bloqueiam scraping — IP bloqueado por Cloudflare)
   - Transfermarkt tem todas as posições mapeadas em `LEGACY_TO_SIGLA` do positions.ts
   - Approach: Playwright headless → squad page por time → extrair posição do HTML
   - 48 times × 26 jogadores = 1248 matches a fazer

### Bloqueios conhecidos
- Sofascore: IP bloqueado (403 em todos os métodos — headless, não-headless, evaluate, navegação direta)
- Flashscore: squad pages retornam shell vazio (10KB) — bloqueio igual
- Ambos usam Cloudflare com detecção de automação robusta

### Estado do banco (2026-06-08 22:13)
- 1249 jogadores, 48 seleções, 104 partidas
- Posições: GK/DEF/MID/FWD (4 categorias — granular pendente)
- Zero duplicatas, zero externalId nulo
