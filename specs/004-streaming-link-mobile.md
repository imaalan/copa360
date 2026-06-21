# 004 — Streaming link no mobile (MatchCard)

## Contexto
O botão "▶ Assistir ao vivo" / "▶ Rever jogo" existe no MatchCard mas está escondido no mobile (`hidden md:flex`). O backend já sincroniza links da CazéTV via YouTube API (cron a cada 30min). Falta expor o link no mobile.

## Escopo

**Dentro:**
- Adicionar segunda linha centralizada no MatchCard mobile quando `streamingLinks` estiver preenchido
- Visível apenas em status TIMED, IN_PLAY, PAUSED e FINISHED (não em POSTPONED)

**Fora:**
- Desktop: sem alteração
- Backend / cron / schema: sem alteração
- Outras emissoras (Globo, SporTV, FIFA+): fora do escopo — só CazéTV via cron

## Decisões

- **Layout mobile:** segunda linha abaixo do bloco principal do card, centralizada horizontalmente
- **Conteúdo:** mesmo label do desktop — `▶ Assistir ao vivo` (TIMED/IN_PLAY/PAUSED) ou `▶ Rever jogo` (FINISHED)
- **Ausência de link:** nada renderiza, card mantém altura original
- **Estilo:** mesma cor dourada do desktop (`text-[#C8A96B]`), mesmo peso de fonte
- **Fonte de dados:** `streamingLinks` já populado pelo cron — sem mudança de backend

## Decisões rejeitadas

- **Badge clicável no centro (VS/placar):** descartado — compromete leitura do placar
- **Alinhamento à esquerda na segunda linha:** descartado pelo usuário — centralizado
- **Links manuais Globo/SporTV:** descartado — manutenção desnecessária, `/onde-assistir` já cobre

## Critérios de aceite

**CA-01:** No mobile (390×844), quando uma partida tem `streamingLinks`, o link `▶ Assistir ao vivo` ou `▶ Rever jogo` é visível abaixo do conteúdo principal do card.

**CA-02:** No mobile, o link é centralizado horizontalmente no card.

**CA-03:** No mobile, quando uma partida NÃO tem `streamingLinks`, nenhum link é renderizado e o card não tem altura extra.

**CA-04:** No desktop (1280×800), o comportamento existente não regride — link aparece à direita, ao lado do badge.

## Arquivos

**OpenCode (frontend):**
- `src/components/MatchesView.tsx` — único arquivo a modificar

**Codex (testes):**
- `e2e/streaming-mobile.spec.ts` — arquivo novo a criar

## Diff budget

- OpenCode: 1 arquivo, ~10 linhas adicionadas
- Codex: 1 arquivo novo, ~50 linhas

## Invariantes

- World-class. Nenhum feature além do pedido.
- Mudanças cirúrgicas: tocar apenas `MatchesView.tsx`, nada mais.
- TDD estrito: testes RED antes de qualquer implementação.
- Sem mocks — dados reais do banco (partidas com streamingLinks já seeded).
- Sem comentários desnecessários no código.
