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
