# APLICAR.md — Guia de aplicação dos patches Copa360

Tempo estimado: **~20 min** (+ ~25 min de pipeline de fotos rodando sozinho).
Pré-requisitos: repo local atualizado (`git pull`), `.env` com `DATABASE_URL`, `FOOTBALL_DATA_API_KEY` e `API_FOOTBALL_KEY` (a mesma que o `enrich-coaches` já usa).

---

## 1. Branch + copiar os arquivos

```bash
cd copa360
git checkout -b fix/pipeline-fotos
# copie o CONTEÚDO da pasta patches/ por cima da raiz do repo
# (estrutura espelhada — pode arrastar no Explorer ou:)
cp -r /caminho/para/patches/* .
```

Arquivos novos: `src/lib/photo-matching.ts`, `src/lib/sync-core.ts`, `scripts/set-photo.ts`, `data/photo-overrides.json`, `__tests__/unit/photo-matching.test.ts`.
Sobrescritos: `prisma/schema.prisma`, `prisma/seed.ts`, `src/app/api/cron/seed/route.ts`, `src/app/api/players/[id]/popup/route.ts`, `src/app/page.tsx`, `src/app/matches/page.tsx`, `src/components/CountdownTimer.tsx`, `scripts/enrich-photos.ts`, `scripts/enrich-stats.ts`.

> Conferência rápida: `git status` deve listar exatamente 15 arquivos (9 modificados + 5 novos + schema).

## 2. Migração do banco (aditiva, sem perda)

```bash
npx prisma db push      # adiciona photoSource, photoVerified, photoUpdatedAt, sdbPlayerId
npx prisma generate
```

## 3. Validar antes de rodar qualquer coisa

```bash
npm run typecheck       # deve passar limpo
npm test                # 55 testes — incluindo a regressão do Rayan
npm run build           # sanidade do Next
```

## 4. Pipeline de fotos — primeiro em dry-run

```bash
npx tsx scripts/enrich-photos.ts --dry-run --tlas=BRA
```

Leia a saída: Fase A deve resolver a seleção na API-Football e casar o elenco por camisa/nome. Se fizer sentido:

```bash
npx tsx scripts/enrich-photos.ts            # todas as seleções (Fases 0+A+B)
```

- Consumo de quota AF: ~48–96 requests na primeira rodada (guard `--af-budget=90`). Se estourar o orçamento no meio, rode de novo amanhã — o `data/af-team-map.json` e os caches `data/af-squads/*.json` fazem a continuação custar quase nada.
- Ao final, abra `reports/photo-review-*.json`: são os casos que o pipeline **se recusou a chutar**.

## 5. Corrigir os casos do relatório (inclui o Rayan)

```bash
# descobrir o jogador (lista com ids se houver homônimos no banco):
npx tsx scripts/set-photo.ts --name="Rayan" --tla=BRA --url=x --dry-run

# aplicar com a URL correta + trava + registro no overrides:
npx tsx scripts/set-photo.ts --name="Rayan" --tla=BRA \
  --url="https://URL_DA_FOTO_CORRETA.png" \
  --note="homônimo Rayan Cherki (FRA)" 
```

Isso grava no banco **e** em `data/photo-overrides.json` — commit esse arquivo e a correção vira permanente em qualquer ambiente/reseed.

## 6. Blindagem para o torneio (recomendado na véspera)

```bash
npx tsx scripts/enrich-photos.ts --download   # baixa tudo p/ public/players/
git add public/players data reports
```

## 7. Commit + deploy

```bash
git add -A
git commit -m "fix: pipeline de fotos determinístico + sync unificado + correções pré-Copa"
git push -u origin fix/pipeline-fotos        # abre PR — a CI valida typecheck/build/e2e
```

## 8. Smoke test pós-deploy

- `/` → countdown mostrando a data real da abertura (vinda do banco) e badges de posição corretos nos destaques;
- `/players` → Rayan com a foto certa; filtros de posição funcionando;
- abrir o popup do Rayan → foto **não** muda (trava `photoVerified`);
- rodar `npm run db:seed` de propósito → **fotos continuam lá** (era o bug nº 1);
- `/matches` → atualizando em ~60s.

## Rollback

Tudo é git + migração aditiva: `git revert` do commit resolve o código; os 4 campos novos no banco são inofensivos se ficarem (ou `prisma db push` após reverter o schema os remove).

## Nota sobre a validação no sandbox

Os patches foram validados num clone real do repo: `tsc --noEmit` limpo e `jest` 55/55. Única ressalva: no sandbox o `prisma generate` não baixa engines (rede restrita), então usei um stub de tipos do client — o passo 3 acima, no seu ambiente com o client real, é a confirmação final. O arquivo `src/app/teams/[slug]/page.tsx` (não modificado) depende da inferência do client gerado e por isso ficou fora do typecheck do sandbox; na sua máquina entra normalmente.
