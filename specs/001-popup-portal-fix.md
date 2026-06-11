# 001 — Popup Portal Fix

## Contexto
PlayerPopup e CoachPopup usam `position: fixed` mas são renderizados como descendentes do div `.animate-page-in`, que recebe `transform: translateY(0)` permanentemente via `animation-fill-mode: both` do `@keyframes pageIn`. CSS transforma esse div num containing block para filhos `fixed`, quebrando o posicionamento relativo ao viewport. Sintoma: ao rolar até o final da página e clicar num jogador, o popup aparece fora do viewport (acima da área visível).

## Escopo

**Dentro:**
- `src/components/PlayerPopup.tsx` — adicionar `createPortal` + mounted guard
- `src/components/CoachPopup.tsx` — mesma mudança

**Fora:**
- `globals.css` — não alterar a animação pageIn
- Qualquer outro componente, página ou arquivo
- Layout, classes CSS, comportamento ou animações existentes

## Decisões

| Decisão | Escolha | Justificativa |
|---|---|---|
| Abordagem | createPortal (A) | Corrige em qualquer página futura; não depende de hipóteses sobre o DOM ancestral |
| Alternativa descartada | Remover transform do pageIn (B) | Frágil — qualquer transform futuro num ancestral recria o bug |
| SSR safety | mounted guard (`useState(false)` + `useEffect`) | `document.body` não existe no servidor; sem guard, SSR quebra |

## Critérios de aceite

1. O popup é renderizado como filho direto de `document.body` (portal), não do `.animate-page-in`
2. O backdrop cobre 100vw × 100vh independente da posição de scroll da página
3. Fechar via ESC continua funcionando (regressão do teste `compatibility.spec.ts:109`)
4. Fechar via click no backdrop continua funcionando
5. `npx tsc --noEmit` retorna sem erros
6. Nenhum erro de hydration no console (mounted guard previne SSR render)

## Arquivos

| Agente | Arquivos permitidos |
|---|---|
| OpenCode | `src/components/PlayerPopup.tsx`, `src/components/CoachPopup.tsx` |
| Codex (RED) | `e2e/popup-portal.spec.ts` (novo) |

## Diff budget

| Agente | Máx. arquivos | Máx. linhas |
|---|---|---|
| Codex (RED) | 1 | ~30 |
| OpenCode (GREEN) | 2 | ~10 por arquivo (~20 total) |

## Invariantes (verbatim CLAUDE.md)

- Toque apenas no que precisa tocar. Limpe apenas a sujeira que você mesmo criou.
- Não "melhore" código, comentários ou formatação adjacentes.
- Não refatore o que não está quebrado.
- Código mínimo que resolve o problema. Nenhum feature além do que foi pedido.
- Nenhuma abstração para código de uso único.
