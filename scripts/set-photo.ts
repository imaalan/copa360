/**
 * set-photo.ts — Correção manual de foto de UM jogador.
 *
 * Faz duas coisas de uma vez:
 *   1. Atualiza o banco (photo, photoSource="override", photoVerified).
 *   2. Grava a entrada em data/photo-overrides.json (versionado em git) —
 *      assim a correção sobrevive a QUALQUER reseed/re-enriquecimento futuro.
 *
 * Uso:
 *   npx tsx scripts/set-photo.ts --name="Rayan" --tla=BRA --url="https://..." 
 *   npx tsx scripts/set-photo.ts --id=842 --url="https://..." --note="homônimo Cherki"
 *   npx tsx scripts/set-photo.ts --name="Rayan" --tla=BRA --url="..." --no-verify
 *   npx tsx scripts/set-photo.ts --id=842 --clear        # remove foto + trava
 *
 * Flags:
 *   --name=     busca por nome (contains, case-insensitive)
 *   --tla=      filtra por seleção (recomendado junto com --name)
 *   --id=       id interno do banco (use quando --name retornar vários)
 *   --url=      URL da foto (ou caminho local tipo /players/123.png)
 *   --note=     anotação livre salva no overrides (ex.: motivo da correção)
 *   --no-verify não trava a foto (default é travar: photoVerified=true)
 *   --clear     limpa photo/trava do jogador e remove do overrides
 *   --dry-run   mostra o que faria, sem escrever
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";

const prisma = new PrismaClient();

const ROOT = path.resolve(__dirname, "..");
const OVERRIDES_FILE = path.join(ROOT, "data", "photo-overrides.json");

// ── CLI args ──────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const strArg = (name: string): string | null => {
  const a = argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : null;
};
const NAME = strArg("name");
const TLA = strArg("tla")?.toUpperCase() ?? null;
const ID = strArg("id") ? Number(strArg("id")) : null;
const URL_ARG = strArg("url");
const NOTE = strArg("note");
const VERIFY = !argv.includes("--no-verify");
const CLEAR = argv.includes("--clear");
const DRY_RUN = argv.includes("--dry-run");

// ── Overrides file helpers ────────────────────────────────────────────────────

type OverridesFile = {
  _doc?: string;
  players: Record<
    string,
    { photo: string; verified?: boolean; note?: string; name?: string; tla?: string }
  >;
};

function readOverrides(): OverridesFile {
  try {
    const parsed = JSON.parse(fs.readFileSync(OVERRIDES_FILE, "utf8")) as OverridesFile;
    parsed.players ??= {};
    return parsed;
  } catch {
    return {
      _doc: "Correções manuais de foto, aplicadas pela FASE 0 do enrich-photos. Chave = externalId (football-data).",
      players: {},
    };
  }
}

function writeOverrides(data: OverridesFile) {
  if (DRY_RUN) return;
  fs.mkdirSync(path.dirname(OVERRIDES_FILE), { recursive: true });
  fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!ID && !NAME) {
    console.error("Informe --id= ou --name= (opcionalmente com --tla=). Veja o cabeçalho do script.");
    process.exit(1);
  }
  if (!CLEAR && !URL_ARG) {
    console.error("Informe --url=\"https://...\" (ou use --clear para limpar a foto).");
    process.exit(1);
  }

  // 1. Localizar o jogador
  const matches = await prisma.player.findMany({
    where: ID
      ? { id: ID }
      : {
          name: { contains: NAME!, mode: "insensitive" },
          ...(TLA ? { team: { tla: TLA } } : {}),
        },
    select: {
      id: true, externalId: true, name: true, nationality: true, position: true,
      shirtNumber: true, photo: true, photoVerified: true,
      team: { select: { tla: true, name: true } },
    },
    orderBy: { id: "asc" },
  });

  if (!matches.length) {
    console.error(`Nenhum jogador encontrado para ${ID ? `id=${ID}` : `name~"${NAME}"${TLA ? ` tla=${TLA}` : ""}`}.`);
    process.exit(1);
  }

  if (matches.length > 1) {
    console.log(`Encontrei ${matches.length} jogadores — refine com --id=:\n`);
    for (const p of matches) {
      console.log(
        `  --id=${String(p.id).padEnd(6)} ${p.name.padEnd(28)} ${p.team?.tla ?? "—"}  #${p.shirtNumber ?? "—"}  ${p.position ?? ""}  ${p.photo ? "(tem foto)" : "(sem foto)"}`
      );
    }
    process.exit(1);
  }

  const player = matches[0];
  console.log(`\nJogador: ${player.name} (${player.team?.tla ?? "—"}) · id=${player.id} · externalId=${player.externalId ?? "—"}`);
  console.log(`Foto atual: ${player.photo ?? "(nenhuma)"}${player.photoVerified ? " 🔒 verificada" : ""}`);

  const overrides = readOverrides();
  const key = player.externalId != null ? String(player.externalId) : null;

  // 2a. Limpar
  if (CLEAR) {
    console.log(`\n→ Limpando foto e trava${key && overrides.players[key] ? " + removendo do overrides" : ""}...`);
    if (!DRY_RUN) {
      await prisma.player.update({
        where: { id: player.id },
        data: { photo: null, photoSource: null, photoVerified: false, photoUpdatedAt: new Date() },
      });
    }
    if (key && overrides.players[key]) {
      delete overrides.players[key];
      writeOverrides(overrides);
    }
    console.log(DRY_RUN ? "(dry-run — nada escrito)" : "✅ Limpo.");
    return;
  }

  // 2b. Definir foto
  console.log(`\n→ Nova foto: ${URL_ARG}`);
  console.log(`→ Trava (photoVerified): ${VERIFY ? "SIM 🔒" : "não"}`);
  if (NOTE) console.log(`→ Nota: ${NOTE}`);

  if (!DRY_RUN) {
    await prisma.player.update({
      where: { id: player.id },
      data: {
        photo: URL_ARG!,
        photoSource: "override",
        photoVerified: VERIFY,
        photoUpdatedAt: new Date(),
      },
    });
  }

  if (key) {
    overrides.players[key] = {
      photo: URL_ARG!,
      verified: VERIFY,
      ...(NOTE ? { note: NOTE } : {}),
      name: player.name,
      tla: player.team?.tla ?? undefined,
    };
    writeOverrides(overrides);
    console.log(`\n✅ Banco atualizado + entrada gravada em data/photo-overrides.json (externalId ${key}).`);
    console.log(`   Commit o arquivo para a correção sobreviver a reseeds em qualquer ambiente.`);
  } else {
    console.log(`\n✅ Banco atualizado. ⚠ Jogador sem externalId — não foi possível registrar no overrides (a trava photoVerified ainda protege contra o enrich).`);
  }
  if (DRY_RUN) console.log(`\n(dry-run — nada escrito)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
