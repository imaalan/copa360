# 003 — Bugfix: CI Typecheck + Mobile Layout (PlayersGrid + Stats)

## Contexto
Três bugs pós-deploy da spec 002:
1. CI falha em "Typecheck" porque `src/__tests__/streaming-sync.test.ts` não está excluído do tsconfig e usa globals do Jest sem tipos.
2. Filtro de posições em `/players` não rola horizontalmente em mobile (375px) — botões quebram linha.
3. Cards "Jogadores Mais Velhos" / "Jogadores Mais Jovens" em `/stats` ficam deformados em mobile — `grid-cols-2` força colunas de ~160px.

## Escopo

**Dentro:**
- Corrigir tsconfig.json para excluir `src/__tests__`
- Tornar os botões de filtro de posição horizontalmente roláveis em mobile
- Corrigir grid dos PlayerAgeTable para empilhar em mobile

**Fora:**
- Qualquer outra mudança em componentes não listados
- Adicionar novos filtros ou funcionalidades
- Alterar testes existentes (RED ou não)

## Decisões

- tsconfig: adicionar `"src/__tests__"` ao array `exclude` (alternativa `**/__tests__/**` excluiria testes em `__tests__/unit/` que já estão OK — não adotar)
- PlayersGrid: container da posição vira `flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-nowrap`; o `flex-wrap` no container pai passa a excluir os botões de posição OU o conjunto posição+busca é reorganizado
- Stats: `grid grid-cols-2 gap-8` → `grid grid-cols-1 md:grid-cols-2 gap-8` nos PlayerAgeTable

## Critérios de aceite

- CA-01: `npm run typecheck` termina sem erros (0 erros TypeScript)
- CA-02: Em viewport 390×844, a linha de filtros de posição em `/players` é horizontalmente rolável — os botões não quebram linha
- CA-03: Em viewport 390×844, os dois cards de idade em `/stats` empilham verticalmente (cada um com largura próxima de 100%)

## Arquivos

**OpenCode (frontend):**
- `src/components/PlayersGrid.tsx` — ajuste no container dos botões de posição
- `src/app/stats/page.tsx` — grid do PlayerAgeTable seção final

**Config (pode ser OpenCode ou Codex):**
- `tsconfig.json` — adicionar `"src/__tests__"` ao exclude

## Diff budget
- 3 arquivos, ~10 linhas alteradas total

## Invariantes
- Nunca alterar testes RED (`src/__tests__/streaming-sync.test.ts`, `e2e/*.spec.ts`)
- Mudanças cirúrgicas — nenhuma refatoração adjacente
- Nenhum feature além do escopo
