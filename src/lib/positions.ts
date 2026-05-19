/**
 * Canonical FIFA/EA Sports FC position definitions.
 * DB stores the sigla (GK, CB, RB...).
 * All components import from here — single source of truth.
 */

export type PositionSigla =
  | "GK"                          // Goleiro
  | "CB" | "RB" | "LB" | "SW"    // Defesa
  | "RWB" | "LWB"                 // Alas defensivos
  | "CDM" | "CM" | "CAM"         // Meio-campo
  | "RM" | "LM"                   // Meias laterais
  | "RW" | "LW"                   // Pontas
  | "CF" | "ST" | "SS"            // Ataque
  | "DEF" | "MID" | "FWD";        // Genéricos (quando API não detalha)

export type PositionInfo = {
  sigla: PositionSigla;
  pt: string;        // PT-BR full label
  group: string;     // UI filter group (PT-BR)
  order: number;     // sort order within group
};

export const POSITIONS: Record<PositionSigla, PositionInfo> = {
  GK:  { sigla: "GK",  pt: "Goleiro",            group: "Goleiros",   order: 0 },
  // Defesa
  CB:  { sigla: "CB",  pt: "Zagueiro",            group: "Defensores", order: 10 },
  SW:  { sigla: "SW",  pt: "Líbero",              group: "Defensores", order: 11 },
  RB:  { sigla: "RB",  pt: "Lateral Direito",     group: "Defensores", order: 12 },
  LB:  { sigla: "LB",  pt: "Lateral Esquerdo",    group: "Defensores", order: 13 },
  RWB: { sigla: "RWB", pt: "Ala Direito",         group: "Defensores", order: 14 },
  LWB: { sigla: "LWB", pt: "Ala Esquerdo",        group: "Defensores", order: 15 },
  DEF: { sigla: "DEF", pt: "Defensor",            group: "Defensores", order: 19 },
  // Meio-campo
  CDM: { sigla: "CDM", pt: "Volante",             group: "Meias",      order: 20 },
  CM:  { sigla: "CM",  pt: "Meia Central",        group: "Meias",      order: 21 },
  CAM: { sigla: "CAM", pt: "Meia Ofensivo",       group: "Meias",      order: 22 },
  RM:  { sigla: "RM",  pt: "Meia Direito",        group: "Meias",      order: 23 },
  LM:  { sigla: "LM",  pt: "Meia Esquerdo",       group: "Meias",      order: 24 },
  MID: { sigla: "MID", pt: "Meia",                group: "Meias",      order: 29 },
  // Ataque
  RW:  { sigla: "RW",  pt: "Ponta Direita",       group: "Atacantes",  order: 30 },
  LW:  { sigla: "LW",  pt: "Ponta Esquerda",      group: "Atacantes",  order: 31 },
  CF:  { sigla: "CF",  pt: "Centroavante",        group: "Atacantes",  order: 32 },
  ST:  { sigla: "ST",  pt: "Atacante",            group: "Atacantes",  order: 33 },
  SS:  { sigla: "SS",  pt: "Segundo Atacante",    group: "Atacantes",  order: 34 },
  FWD: { sigla: "FWD", pt: "Atacante",            group: "Atacantes",  order: 39 },
};

export const GROUP_ORDER = ["Goleiros", "Defensores", "Meias", "Atacantes", "Outros"];
export const POSITION_GROUPS_FILTER = ["Todos", "Goleiro", "Defensor", "Meia", "Atacante"];

// Filter group singular form (for PlayersGrid filter buttons)
export const GROUP_TO_FILTER: Record<string, string> = {
  Goleiros:   "Goleiro",
  Defensores: "Defensor",
  Meias:      "Meia",
  Atacantes:  "Atacante",
};

export function getPosition(sigla: string | null): PositionInfo & { abbr: string } {
  if (!sigla) return { sigla: "MID" as PositionSigla, pt: "—", group: "Outros", order: 99, abbr: "—" };
  const info = POSITIONS[sigla as PositionSigla];
  if (info) return { ...info, abbr: sigla };
  return { sigla: sigla as PositionSigla, pt: sigla, group: "Outros", order: 99, abbr: sigla.slice(0, 3) };
}

// Map from old football-data.org / TM strings → FIFA sigla (for DB migration + enrichment scripts)
export const LEGACY_TO_SIGLA: Record<string, PositionSigla> = {
  // football-data.org
  "Goalkeeper":          "GK",
  "Defence":             "DEF",
  "Centre-Back":         "CB",
  "Center-Back":         "CB",
  "Left-Back":           "LB",
  "Left Back":           "LB",
  "Right-Back":          "RB",
  "Right Back":          "RB",
  "Midfield":            "MID",
  "Defensive Midfield":  "CDM",
  "Central Midfield":    "CM",
  "Attacking Midfield":  "CAM",
  "Right Midfield":      "RM",
  "Left Midfield":       "LM",
  "Offence":             "FWD",
  "Left Winger":         "LW",
  "Right Winger":        "RW",
  "Centre-Forward":      "CF",
  "Center-Forward":      "CF",
  "Secondary Striker":   "SS",
  "Second Striker":      "SS",
  // Transfermarkt
  "Defender":            "DEF",
  "Centre Back":         "CB",
  "Right Wing-Back":     "RWB",
  "Left Wing-Back":      "LWB",
  "Midfielder":          "MID",
  "Defensive Midfielder":"CDM",
  "Central Midfielder":  "CM",
  "Attacking Midfielder":"CAM",
  "Right Midfielder":    "RM",
  "Left Midfielder":     "LM",
  "Attacker":            "FWD",
  "Forward":             "FWD",
  "Striker":             "ST",
  "Centre Forward":      "CF",
  // API-Football
  "G":                   "GK",
  "D":                   "DEF",
  "M":                   "MID",
  "F":                   "FWD",
};

export function normPosition(raw: string | null | undefined): PositionSigla | null {
  if (!raw) return null;
  if (POSITIONS[raw as PositionSigla]) return raw as PositionSigla;
  return LEGACY_TO_SIGLA[raw] ?? null;
}
