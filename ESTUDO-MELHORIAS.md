# Copa360 — Estudo de Melhorias

**Data:** 09/06/2026 (D-2 da abertura) · **Live:** copa360.vercel.app · **Repo:** github.com/imaalan/copa360
**Escopo:** projeto inteiro, com prioridade no pipeline de fotos · **Restrição:** somente soluções gratuitas
**Entrega:** este estudo + pasta `patches/` validada (typecheck `tsc --noEmit` limpo + **55/55 testes Jest passando**, incluindo regressão do caso Rayan)

---

## 1. Diagnóstico — por que as fotos somem e por que vêm erradas

O problema relatado ("a cada atualização do banco as fotos se perdem, e os filtros pegam fotos erradas") na verdade são **três bugs independentes** que se retroalimentam.

### 1.1 As fotos somem: `prisma/seed.ts` divergiu do cron

Existem **duas implementações de sync** no repo, e elas divergiram:

| | `/api/cron/seed` (diário, 06:00 UTC) | `prisma/seed.ts` (`npm run db:seed`) |
|---|---|---|
| `photo` no update | ✅ não toca | ❌ **`photo: p.photo ? ... : null`** — football-data não envia foto ⇒ **zera TODAS as fotos** |
| `position` no update | ✅ `normPosition()` → sigla FIFA | ❌ string crua ("Centre-Forward") ⇒ **quebra filtros e badges** até rodar `sync:squads` |
| `name` no update | ❌ reverte para o nome da fonte | ❌ idem |

Ou seja: cada `npm run db:seed` (que você roda quando saem convocações novas — exatamente agora, véspera de Copa) **destrói o enriquecimento inteiro de fotos** e ainda corrompe as posições. E o cron diário, embora não apague fotos, **reverte os nomes** melhorados pelo `enrich-names` ("Igor Thiago" → "Thiago") toda madrugada — o que degrada o matching de fotos por nome nas rodadas seguintes. Clássico bug de duplicação: duas fontes da verdade, uma atualizada, outra fossilizada.

### 1.2 As fotos vêm erradas: matching frouxo em **três** pontos do código

O caso Rayan não é um acidente isolado — é consequência direta de quatro decisões de matching, presentes em `scripts/enrich-photos.ts` **e** em `src/app/api/players/[id]/popup/route.ts` (sim, a rota do popup faz enriquecimento em runtime e **persiste o erro no banco** quando alguém abre o card), ambos via helpers de `src/lib/utils.ts`:

1. **Fallback "resultado único ⇒ aceita"** (`byName.length === 1 ? byName[0] : null`): se a TheSportsDB só conhece UM "Rayan" — e é o Cherki — ele entra **sem nenhuma validação de nacionalidade**. É a porta de entrada principal do bug.
2. **`nationalityMatch` com `startsWith(slice(0,4))`**: tolerância a gentílico implementada por prefixo. Efeito colateral comprovado em teste: **Austria ≈ Australia** (`"austr"` vs `"aust"`). Qualquer par de países com 4 letras iguais colide.
3. **`nameMatch` com substring bidirecional**: `"rayan" ⊆ "rayan cherki"` ⇒ match. Para mononímios brasileiros (Rayan, Endrick, Estêvão...), isso casa com qualquer homônimo do planeta.
4. **Data de nascimento ignorada**: o banco TEM `dateOfBirth` (football-data) e a SDB TEM `dateBorn` — o desambiguador praticamente perfeito entre homônimos — e nenhum dos dois lados era consultado.

Agravantes estruturais: o `idPlayer` da SDB nunca era persistido (toda rodada refaz a busca por nome, não-determinística), e não existia nenhuma **trava** — você corrigia o Rayan na mão e a próxima rodada do enrich (ou o próximo clique no popup) sobrescrevia de volta.

### 1.3 Quota da API-Football queimada em runtime

A rota do popup ainda fazia `GET /teams?search` + `GET /players?search={sobrenome}` por jogador aberto — 2 a 4 requests da quota free (**100/dia**) por clique, com matching por sobrenome (mais homônimos). Enquanto isso, o endpoint `/players/squads?team={id}` entrega **o elenco inteiro da seleção, com foto por ID estável, em 1 request**. 48 seleções = 48 requests, uma vez.

---

## 2. Arquitetura da solução (100% gratuita)

```
                      ┌─────────────────────────────────────────────┐
 npm run enrich:photos│  FASE 0 · data/photo-overrides.json (git)   │ sempre vence
                      ├─────────────────────────────────────────────┤
                      │  FASE A · API-Football /players/squads      │ 1 req/seleção
                      │  match POR ELENCO: camisa → nome → idade    │ ID estável
                      │  cache: data/af-squads/{TLA}.json (git)     │ reruns = 0 req
                      ├─────────────────────────────────────────────┤
                      │  FASE B · TheSportsDB (só p/ quem sobrou)   │
                      │  por sdbPlayerId quando conhecido; busca    │
                      │  por nome SÓ com: nacionalidade canônica    │
                      │  OBRIGATÓRIA + DOB obrigatória quando       │
                      │  comparável + posição como desempate        │
                      ├─────────────────────────────────────────────┤
                      │  FASE C · --download → public/players/      │ opcional
                      └──────────────────┬──────────────────────────┘
                                         ▼
            ambíguo / não encontrado → reports/photo-review-*.json
                                         ▼
            npx tsx scripts/set-photo.ts → banco + overrides (git)
```

Princípios de engenharia por trás:

**ID-first.** Depois do primeiro match confiante, o jogador fica amarrado a IDs estáveis (`apiFootballId`, `sdbPlayerId`). Rodadas futuras não dependem mais de busca por nome — viram lookups determinísticos.

**Match por escopo, não global.** Na Fase A o matching acontece DENTRO do elenco de 26 jogadores da própria seleção — a camisa é quase chave primária ali, e homônimo global deixa de existir como classe de problema.

**Validação obrigatória, nunca opcional.** Nacionalidade comparada por **país canônico** (mapa de ~60 grupos país+gentílico: Brazil↔Brazilian, USA↔United States, Korea Republic↔South Korea, Côte d'Ivoire↔Ivory Coast... e zero `startsWith`). DOB comparada sempre que existir dos dois lados — e divergência **reprova**, mesmo com nome e país iguais.

**Ambíguo não é palpite, é relatório.** Quando o pipeline não tem certeza, ele não escolhe: registra em `reports/photo-review-*.json` com os candidatos, e você resolve em 30 segundos com `set-photo.ts` — que grava no banco **e** no `photo-overrides.json` versionado. A correção vira código: sobrevive a reseed, redeploy, troca de ambiente.

**Trava explícita.** `photoVerified = true` significa "humano confirmou": nenhuma fase, nem `--force`, nem o popup em runtime, toca nessa foto de novo.

**Proveniência.** `photoSource` (`override | api-football | thesportsdb | local`) + `photoUpdatedAt` permitem auditar de onde veio cada foto — e medir qual fonte está performando.

Novos campos no `Player` (migração aditiva, `npx prisma db push` resolve):

```prisma
photoSource     String?   // "api-football" | "thesportsdb" | "override" | "local"
photoVerified   Boolean   @default(false)
photoUpdatedAt  DateTime?
sdbPlayerId     String?
```

**Orçamento de quota (tudo free tier):** Fase A consome ~48–96 requests da API-Football **uma única vez** (resolução de IDs de seleção + elencos), com guarda `--af-budget=90` para nunca estourar os 100/dia — e como os elencos ficam cacheados em `data/af-squads/`, as rodadas seguintes custam **zero**. A SDB free aguenta o resto com delay de 700ms. A CDN `media.api-sports.io` é hotlink público sem chave e **já está** no `remotePatterns` do seu `next.config.ts`.

**Fase C (download local) — trade-off honesto:** baixar ~1.2k fotos para `public/players/` (~40–80MB no repo) elimina QUALQUER dependência externa de imagem durante a Copa (SDB fora do ar? CDN lenta? irrelevante) e a Vercel serve estático de graça. O custo é peso no git e a necessidade de redeploy para atualizar foto. Minha recomendação: rode o pipeline com hotlink agora (D-2), e execute `--download` na véspera como blindagem para o torneio.

---

## 3. Patches entregues (pasta `patches/`, espelhando o repo)

| Arquivo | Tipo | O que muda |
|---|---|---|
| `src/lib/photo-matching.ts` | **novo** | Matcher estrito: países canônicos, DOB, grupos de posição, `pickSdbCandidate`, `matchAfSquadPlayer`. Funções puras, 100% testáveis |
| `__tests__/unit/photo-matching.test.ts` | **novo** | 25 testes novos — **regressão Rayan** (rejeita Cherki; escolhe o BRA por DOB), Austria≠Australia, dob-mismatch, ambíguo, mononímio no elenco |
| `src/lib/sync-core.ts` | **novo** | Sync unificado football-data usado por seed E cron. `update` nunca toca foto/nome/enriquecimento. Bônus: passa a preencher `homeTeamId/awayTeamId` no update (o chaveamento do mata-mata era criado vazio e **nunca seria preenchido**) e a atualizar `utcDate` (remarcações) |
| `prisma/seed.ts` | reescrito | Wrapper fino da sync-core — **o bug que zerava as fotos morre aqui** |
| `src/app/api/cron/seed/route.ts` | reescrito | Wrapper fino da sync-core (auth e contrato de resposta intactos) |
| `src/app/api/players/[id]/popup/route.ts` | reescrito | Matching estrito via lib; respeita `photoVerified`; persiste `sdbPlayerId`/proveniência; **remove a busca AF por nome em runtime** (só consome `apiFootballId` já resolvido offline) |
| `prisma/schema.prisma` | editado | 4 campos novos no `Player` (acima) |
| `scripts/enrich-photos.ts` | reescrito | Pipeline v2 em 4 fases (seção 2), com relatório de revisão e flags `--dry-run --tlas= --force --skip-af --skip-sdb --download --af-budget=` |
| `scripts/set-photo.ts` | **novo** | Correção manual em 1 comando: banco + override versionado + trava |
| `data/photo-overrides.json` | **novo** | Template documentado (com o slot do Rayan para você preencher a URL correta) |
| `src/app/page.tsx` | editado | `ATTACK_POSITIONS` e `posLabel` migrados para siglas FIFA (estavam com strings legadas ⇒ fallback de destaque morto e badge "JOG" para todo mundo); countdown alimentado pelo banco |
| `src/components/CountdownTimer.tsx` | reescrito | Aceita `targetIso` — **a data hardcoded (19/06) estava errada: a abertura é 11/06**. Agora o alvo é o `min(utcDate)` dos jogos futuros no seu próprio banco, e depois da estreia vira countdown para o próximo jogo |
| `src/app/matches/page.tsx` | editado | `revalidate: 300 → 60` — Copa em andamento, placar com no máx. 1min de atraso (ISR; football-data free 10 req/min aguenta de sobra 1 fetch/min) |
| `scripts/enrich-stats.ts` | editado | Temporada default Understat `"2024" → "2025"` (a 2025/26 acabou de encerrar; os números de 2024/25 estão defasados) |

**Validação executada** (cópia do repo + patches): `npm ci` → `tsc --noEmit` **0 erros** → `jest __tests__/unit` **55/55 PASS** (30 existentes intactos + 25 novos). Nota de honestidade: no meu sandbox o `prisma generate` não roda (rede restrita), então o typecheck usou um stub de tipos do client; o seu `npm run typecheck` local/CI com o client real é a confirmação final — e os campos novos existem no schema do patch, então não há razão para divergir.

---

## 4. Backlog recomendado (não incluído nos patches)

**P1 — primeira semana de Copa**
- **CI não roda os testes unitários.** O `ci.yml` faz typecheck+lint+build+e2e, mas **não tem `npm test`** — o teste de regressão do Rayan só protege se rodar. Adicionar um step `- run: npm test` antes do build (30s de CI).
- **`FEATURED_STARS` por nome exato** (`p.name === "Vinicius Junior"`): basta o enrich-names mudar o nome para o destaque da home sumir. Trocar para `externalId` (estável) ou `contains` defensivo.
- **`displayName` separado de `name`**: a sync-core agora preserva `name` no update (trade-off: correção de nome na origem não propaga — rode `enrich:names --all` quando quiser ressincronizar). A solução definitiva é um campo `displayName` que o enrich escreve e a UI prefere, deixando `name` livre para a fonte.
- **Classificação dos grupos**: o model `GroupStanding` existe no schema mas nada o popula — e a football-data tem `/competitions/WC/standings` de graça. É A feature de Copa em andamento (tabela ao vivo por grupo na `/matches`).

**P2 — durante/pós-Copa**
- `package.json` ainda se chama `"prepcopa-app"`; e2e cobrindo "foto verificada nunca muda"; OG images por jogador para compartilhamento (a Copa é o momento de viralizar); monitoramento do cron (resposta `ok:false` → notificação); avaliar `next/image` otimizado quando as fotos forem locais (Fase C).

---

## 5. Runbook — próximos 7 dias

| Quando | O quê |
|---|---|
| **Hoje (D-2)** | Aplicar patches (ver `APLICAR.md`) → `npx prisma db push` → `npm test` → `enrich:photos --dry-run` → rodada real → revisar `reports/` → `set-photo` para o Rayan e demais casos do relatório |
| **D-1 (10/06)** | `enrich:names --all` (nomes completos pós-convocação) → `enrich:stats --force` (temporada 2025/26) → `enrich:photos --download` (blindagem: fotos locais para o torneio) → commit de `data/` + `public/players/` |
| **Durante a Copa** | O cron diário cuida do resto sem destruir nada; fotos travadas ficam travadas; placares com 60s de atraso máximo; caso novo de foto errada = 1 comando do `set-photo` e nunca mais volta |

---

*Estudo gerado a partir do clone real do repo (master de 09/06/2026), com cada afirmação verificada no código. Os patches compilam e os testes provam o comportamento — incluindo o teste que garante que o Rayan nunca mais vira o Cherki.* ⚽
