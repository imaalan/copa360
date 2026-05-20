/**
 * seed-coaches.ts — Seed coach records for all 48 WC 2026 teams.
 *
 * Data sources:
 *   - Known coaches: hardcoded from official announcements (ESPN/official sources)
 *   - Photos + career stats: enriched via enrich-coaches.ts
 *
 * Usage:
 *   npx tsx scripts/seed-coaches.ts
 *   npx tsx scripts/seed-coaches.ts --dry-run
 */

import { prisma } from "../src/lib/prisma";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");

// Coaches sourced from official announcements (ESPN / national federations)
const COACHES: Record<string, { name: string; nationality: string; contractStart?: string }> = {
  ARG: { name: "Lionel Scaloni",      nationality: "Argentina",      contractStart: "2018" },
  AUS: { name: "Tony Popovic",        nationality: "Australia",      contractStart: "2024" },
  AUT: { name: "Ralf Rangnick",       nationality: "Germany",        contractStart: "2022" },
  BEL: { name: "Rudi Garcia",         nationality: "France",         contractStart: "2023" },
  BIH: { name: "Sergej Barbarez",     nationality: "Bosnia and Herzegovina", contractStart: "2022" },
  BRA: { name: "Carlo Ancelotti",     nationality: "Italy",          contractStart: "2024" },
  CAN: { name: "Jesse Marsch",        nationality: "United States",  contractStart: "2023" },
  CIV: { name: "Emerse Faé",          nationality: "France",         contractStart: "2024" },
  COD: { name: "Sébastien Desabre",   nationality: "France",         contractStart: "2023" },
  COL: { name: "Néstor Lorenzo",      nationality: "Argentina",      contractStart: "2022" },
  CPV: { name: "Bubista",             nationality: "Portugal",       contractStart: "2021" },
  CRO: { name: "Zlatko Dalić",        nationality: "Croatia",        contractStart: "2017" },
  CUR: { name: "Dick Advocaat",       nationality: "Netherlands",    contractStart: "2023" },
  CZE: { name: "Miroslav Koubek",     nationality: "Czechia",        contractStart: "2023" },
  ECU: { name: "Sebastián Beccacece", nationality: "Argentina",      contractStart: "2023" },
  EGY: { name: "Hossam Hassan",       nationality: "Egypt",          contractStart: "2024" },
  ENG: { name: "Thomas Tuchel",       nationality: "Germany",        contractStart: "2024" },
  ESP: { name: "Luis de la Fuente",   nationality: "Spain",          contractStart: "2023" },
  FRA: { name: "Didier Deschamps",    nationality: "France",         contractStart: "2012" },
  GER: { name: "Julian Nagelsmann",   nationality: "Germany",        contractStart: "2023" },
  GHA: { name: "Carlos Queiroz",      nationality: "Portugal",       contractStart: "2024" },
  HAI: { name: "Sébastien Migné",     nationality: "France",         contractStart: "2023" },
  IRN: { name: "Amir Ghalenoei",      nationality: "Iran",           contractStart: "2023" },
  IRQ: { name: "Graham Arnold",       nationality: "Australia",      contractStart: "2024" },
  JOR: { name: "Jamal Sellami",       nationality: "Tunisia",        contractStart: "2022" },
  JPN: { name: "Hajime Moriyasu",     nationality: "Japan",          contractStart: "2018" },
  KOR: { name: "Hong Myung-Bo",       nationality: "South Korea",    contractStart: "2023" },
  KSA: { name: "Georgios Donis",      nationality: "Greece",         contractStart: "2024" },
  MAR: { name: "Walid Regragui",      nationality: "Morocco",        contractStart: "2022" },
  MEX: { name: "Javier Aguirre",      nationality: "Mexico",         contractStart: "2024" },
  NED: { name: "Ronald Koeman",       nationality: "Netherlands",    contractStart: "2023" },
  NOR: { name: "Ståle Solbakken",     nationality: "Norway",         contractStart: "2020" },
  NZL: { name: "Darren Bazeley",      nationality: "England",        contractStart: "2023" },
  PAN: { name: "Thomas Christiansen", nationality: "Spain",          contractStart: "2022" },
  PAR: { name: "Gustavo Alfaro",      nationality: "Argentina",      contractStart: "2023" },
  POR: { name: "Roberto Martínez",    nationality: "Spain",          contractStart: "2022" },
  QAT: { name: "Julen Lopetegui",     nationality: "Spain",          contractStart: "2024" },
  RSA: { name: "Hugo Broos",          nationality: "Belgium",        contractStart: "2021" },
  SCO: { name: "Steve Clarke",        nationality: "Scotland",       contractStart: "2019" },
  SEN: { name: "Pape Thiaw",          nationality: "Senegal",        contractStart: "2022" },
  SUI: { name: "Murat Yakin",         nationality: "Switzerland",    contractStart: "2021" },
  SWE: { name: "Graham Potter",       nationality: "England",        contractStart: "2024" },
  TUN: { name: "Sabri Lamouchi",      nationality: "France",         contractStart: "2024" },
  TUR: { name: "Vincenzo Montella",   nationality: "Italy",          contractStart: "2023" },
  URY: { name: "Marcelo Bielsa",      nationality: "Argentina",      contractStart: "2023" },
  USA: { name: "Mauricio Pochettino", nationality: "Argentina",      contractStart: "2023" },
  UZB: { name: "Fabio Cannavaro",     nationality: "Italy",          contractStart: "2023" },
  ALG: { name: "Vladimir Petković",   nationality: "Switzerland",    contractStart: "2023" },
};

async function main() {
  const teams = await prisma.team.findMany({
    select: { id: true, tla: true, name: true },
    where: { tla: { not: null } },
  });

  let created = 0, updated = 0, skipped = 0;

  for (const team of teams) {
    const tla = team.tla!;
    const coachData = COACHES[tla];

    if (!coachData) {
      console.log(`[${tla}] No coach data — skip`);
      skipped++;
      continue;
    }

    console.log(`[${tla}] ${coachData.name}`);

    if (DRY) continue;

    const existing = await prisma.coach.findUnique({ where: { teamId: team.id } });

    if (existing) {
      await prisma.coach.update({
        where: { teamId: team.id },
        data: {
          name: coachData.name,
          nationality: coachData.nationality,
          contractStart: coachData.contractStart,
        },
      });
      updated++;
    } else {
      await prisma.coach.create({
        data: {
          name: coachData.name,
          nationality: coachData.nationality,
          contractStart: coachData.contractStart,
          teamId: team.id,
        },
      });
      created++;
    }
  }

  console.log(`\nDone. Created: ${created} | Updated: ${updated} | Skipped: ${skipped}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
