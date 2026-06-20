# 002 — Onde Assistir + Brincar de Técnico

## Contexto
Copa360 não informa onde assistir aos jogos nem integra experiências externas. Duas features de engajamento: (1) links automáticos de streaming da CazéTV por jogo via YouTube Data API; (2) promoção do jogo de técnico 7a0.com.br.

## Escopo

### Dentro
- `streamingLinks Json?` no modelo `Match`
- Cliente YouTube Data API (API key, sem OAuth) buscando streams do canal CazéTV
- Matching: `scheduledStartTime` ±2h + validação de nomes dos times com regex PT-BR/EN
- Sync no cron de scores (30min) — `syncStreamingLinks()` após atualizar placares
- MatchCard: botão "▶ Assistir ao vivo" (TIMED/IN_PLAY/PAUSED) ou "▶ Rever jogo" (FINISHED)
- Página `/onde-assistir`: cards estáticos de Globo, SporTV, CazéTV, FIFA+
- NavHeader: link "Onde Assistir" + pill destacado "Seja Técnico" → `https://7a0.com.br/`
- Home: card promocional 7a0.com.br entre FEATURED PLAYERS e TEAM MOSAIC

### Fora
- Tabela de classificação (postergada)
- Outros streamings além de CazéTV
- Admin UI para links manuais
- Bracket/chaveamento visual

## Decisões

| # | Decisão | Justificativa |
|---|---|---|
| D1 | YouTube Data API com API key simples | Canal CazéTV é público; sem OAuth necessário |
| D2 | Matching duplo: data ±2h + regex PT-BR/EN | Determinístico e robusto a variações de título |
| D3 | `streamingLinks Json?` array `{platform, url}` | Extensível sem nova migration |
| D4 | Botão em todos os statuses exceto POSTPONED | YouTube mantém VOD após a live |
| D5 | Sync junto ao cron de scores | Sem job separado; frequência adequada |
| D6 | `/onde-assistir` estática | Não há API para dados de broadcast |
| D7 | Pill no NavHeader + card na home | Máxima visibilidade; diferenciação visual de links internos |

## Critérios de Aceite

### CA-01 — Schema
`Match` model contém `streamingLinks Json?`. Migration aplicada sem breaking change.

### CA-02 — YouTube API client
`src/lib/youtube-api.ts` exporta função que retorna `{ videoId, title, scheduledStartTime, url }[]`. Retorna `[]` em erro (sem throw).

### CA-03 — Matching streaming-sync
`src/lib/streaming-sync.ts` exporta `matchStreamToGame(stream, matches)`:
- `null` se `scheduledStartTime` fora de ±2h de todo `utcDate`
- `null` se nenhum time aparece no título (após regex normalização PT-BR/EN)
- `Match` correto quando ambas as validações passam

### CA-04 — Cron atualiza streamingLinks
`GET /api/cron/scores` chama `syncStreamingLinks()` após atualizar placares.

### CA-05 — MatchCard botão correto
- `streamingLinks` não-vazio + `IN_PLAY` → "▶ Assistir ao vivo" visível
- `streamingLinks` não-vazio + `FINISHED` → "▶ Rever jogo" visível
- `streamingLinks` não-vazio + `POSTPONED` → sem botão
- `streamingLinks` null/vazio → sem botão
- Botão é `<a target="_blank" rel="noopener noreferrer">`

### CA-06 — `/onde-assistir` renderiza 4 broadcasters
Cards de Globo, SporTV, CazéTV e FIFA+ presentes no DOM com links externos.

### CA-07 — NavHeader "Onde Assistir"
Link `/onde-assistir` no menu desktop E no menu mobile.

### CA-08 — NavHeader pill "Seja Técnico"
Elemento destacado visualmente abre `https://7a0.com.br/` em nova aba.

### CA-09 — Card home 7a0.com.br
Entre FEATURED PLAYERS e TEAM MOSAIC com copy:
- "Role o dado."
- "Monte sua seleção dos sonhos"
- "Role o dado: sai uma seleção e uma Copa. Escale um craque que esteve lá, complete os 11 e simule — seu time faz 7 a 0?"
- CTA → `https://7a0.com.br/` em nova aba

## Arquivos por Agente

### Codex (RED)
- `src/__tests__/streaming-sync.test.ts` — unit tests CA-02, CA-03
- `e2e/onde-assistir.spec.ts` — E2E CA-05, CA-06, CA-07
- `e2e/brincar-tecnico.spec.ts` — E2E CA-08, CA-09

### Gemini (backend)
- `prisma/schema.prisma` — add `streamingLinks Json?` to Match
- `prisma/migrations/*/migration.sql` — auto-gerado
- `src/lib/youtube-api.ts` — criar
- `src/lib/streaming-sync.ts` — criar
- `src/app/api/cron/scores/route.ts` — add syncStreamingLinks()

### OpenCode (frontend)
- `src/components/NavHeader.tsx`
- `src/components/MatchesView.tsx`
- `src/app/matches/page.tsx`
- `src/app/onde-assistir/page.tsx` — criar
- `src/app/page.tsx`

## Diff Budget
| Agente | Máx. arquivos | ~Linhas |
|---|---|---|
| Codex RED | 3 | ~120 |
| Gemini | 5 | ~200 |
| OpenCode | 5 | ~200 |

## Env Vars
- `YOUTUBE_API_KEY` — `.env`, `.env.example`, Vercel, GitHub Actions secrets

## Invariantes
- TDD estrito: RED primeiro, código depois
- Mudanças cirúrgicas: só arquivos da whitelist
- `YOUTUBE_API_KEY` via env var, nunca hardcoded
- YouTube API: uma chamada por cron run, não por jogo
- Dark-first, tipografia editorial, referência Apple/Linear/Vercel
