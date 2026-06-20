import { getCazetvStreams } from "./youtube-api";
import { prisma } from "./prisma";

function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const nameVariants: Record<string, string[]> = {
  brasil: ["brazil"],
  alemanha: ["germany"],
  franca: ["france"],
  espanha: ["spain"],
  italia: ["italy"],
  suica: ["switzerland"],
  austria: ["austria"],
};

function extractTeamName(val: unknown): string | null {
  if (typeof val === "string") return val;
  if (val && typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if (typeof obj.name === "string") return obj.name;
  }
  return null;
}

function getTeamNames(match: Record<string, unknown>): string[] {
  const names: string[] = [];
  for (const key of ["homeTeam", "awayTeam", "homeTeamName", "awayTeamName"]) {
    const val = match[key];
    const name = extractTeamName(val);
    if (name) names.push(name);
  }
  return names;
}

function matchesTitle(title: string, teamNames: string[]): boolean {
  const normalizedTitle = normalize(title);
  for (const name of teamNames) {
    const normalizedName = normalize(name);
    if (normalizedTitle.includes(normalizedName)) return true;
    const variants = nameVariants[normalizedName];
    if (variants) {
      for (const variant of variants) {
        if (normalizedTitle.includes(variant)) return true;
      }
    }
  }
  return false;
}

export function matchStreamToGame(
  stream: { title: string; scheduledStartTime: string },
  matches: Record<string, unknown>[],
): Record<string, unknown> | null {
  const streamTime = new Date(stream.scheduledStartTime).getTime();

  for (const match of matches) {
    const matchTime = new Date(match.utcDate as string | Date).getTime();
    const diff = Math.abs(streamTime - matchTime);
    if (diff <= 2 * 60 * 60 * 1000) {
      const teamNames = getTeamNames(match);
      if (matchesTitle(stream.title, teamNames)) {
        return match;
      }
    }
  }

  return null;
}

export async function syncStreamingLinks(): Promise<void> {
  try {
    const streams = await getCazetvStreams();
    if (streams.length === 0) return;

    const now = new Date();
    const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const matches = await prisma.match.findMany({
      where: { utcDate: { gte: windowStart, lte: windowEnd } },
      include: { homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } },
    });

    for (const stream of streams) {
      const match = matchStreamToGame(stream, matches);
      if (match) {
        await prisma.match.update({
          where: { id: match.id as number },
          data: {
            streamingLinks: [{ platform: "CazéTV", url: stream.url }],
          },
        });
      }
    }
  } catch (err) {
    console.error("[streaming-sync]", err);
  }
}
