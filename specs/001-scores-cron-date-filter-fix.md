# 001 — Scores Cron + Date Filter Fix

## Contexto

Dois bugs em produção na Copa360:

1. **Placares nunca atualizam** — o cron `/api/cron/scores` existente e funcional não é disparado por nenhum mecanismo (Vercel cron removido por incompatibilidade com Hobby plan; nenhum workflow GitHub Actions existe para isso).
2. **Filtro de datas inacessível no desktop** — chips de data usam `overflow-x-auto` com scrollbars 100% ocultos. No desktop sem trackpad, datas após o que cabe na tela (ex: após 23/6) são inacessíveis.

## Escopo

**Dentro:**
- Adicionar workflow GitHub Actions que chama `GET /api/cron/scores` a cada 30 minutos
- Adicionar setas de navegação (< >) ao chip bar de datas — visíveis apenas no desktop (`hidden md:flex`), aparecem condicionalmente com base em overflow

**Fora:**
- Qualquer mudança na lógica de filtragem de datas existente
- Qualquer mudança no endpoint `/api/cron/scores`
- Qualquer mudança no CI ou no nightly workflow
- Scores em tempo real (sub-minuto)

## Decisões

| Decisão | Escolha | Justificativa |
|---|---|---|
| Frequência do cron | 30 min | Aceitável para jogos ao vivo; consome ~1.400 min/mês (dentro do free tier) |
| UX do chip bar | Setas < > no desktop | Touch scroll já funciona no mobile; desktop precisa de controle explícito |
| Setas em mobile | Ocultas (`hidden md:flex`) | Touch scroll é suficiente e setas poluem o layout mobile |
| Método HTTP do endpoint | GET | O route handler existente é `export async function GET` |

## Decisões rejeitadas

- **Chips em múltiplas linhas (flex-wrap):** ocupa muito espaço vertical, especialmente com ~39 dias de torneio.
- **Dropdown de data:** quebra o padrão visual de chips do design system.
- **Cron a cada 5 min:** desnecessário; 30 min é suficiente e preserva os minutos do GitHub Actions free tier.

## Critérios de aceite

1. Um workflow `.github/workflows/scores.yml` existe com schedule `*/30 * * * *` e chama `GET https://copa360.vercel.app/api/cron/scores` com header `Authorization: Bearer ${{ secrets.CRON_SECRET }}`.
2. O chip bar de datas renderiza um botão "‹" à esquerda e "›" à direita do container.
3. O botão "‹" fica desabilitado/oculto quando o scroll está no início (scrollLeft === 0).
4. O botão "›" fica desabilitado/oculto quando o scroll está no fim (scrollLeft + clientWidth >= scrollWidth).
5. Clicar "›" avança o scroll do container em ~200px com comportamento smooth.
6. Clicar "‹" recua o scroll do container em ~200px com comportamento smooth.
7. Os botões de seta são `hidden md:flex` — não aparecem em telas < md.
8. O container de chips continua com `overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden` (scrollbar oculta, scroll nativo mantido).
9. Os testes existentes (unit + E2E) continuam passando sem alteração.

## Arquivos

| Agente | Arquivos permitidos |
|---|---|
| OpenCode (frontend) | `src/components/MatchesView.tsx` |
| (DevOps) GitHub Actions | `.github/workflows/scores.yml` (novo arquivo) |

> Nota: o workflow scores.yml requer que `CRON_SECRET` seja adicionado como GitHub Actions secret (mesmo valor já presente nas env vars da Vercel).

## Diff budget

| Agente | Máx. arquivos | Ordem de grandeza |
|---|---|---|
| OpenCode | 1 | ~50 linhas alteradas em MatchesView.tsx |
| Workflow | 1 (novo) | ~25 linhas |

## Invariantes (verbatim do CLAUDE.md)

- Código mínimo que resolve o problema. Nenhum feature além do que foi pedido.
- Nenhuma abstração para código de uso único.
- Toque apenas no que precisa tocar. Não "melhore" código adjacente.
- Cada linha alterada deve rastrear diretamente para a solicitação.
- Dark-first. Consistência com o design system existente (chips gold `#C8A96B`, dark `#111315`, borders `white/[0.08]`).
