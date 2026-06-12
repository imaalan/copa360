export const runtime = "nodejs";
export const maxDuration = 30;

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const API_BASE = "https://api.football-data.org/v4";

/**
 * /api/cron/scores — Atualiza placares a cada 5 min (Vercel Cron).
 * DB-first: só chama a API se houver partida nas próximas 2h ou últimas 4h.
 * 1 request por execução quando há jogos; 0 requests fora de janela de jogo.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const now = new Date();
  const windowStart = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  try {
    // Check if any match falls in the active window before calling the API
    const activeMatch = await prisma.match.findFirst({
      where: { utcDate: { gte: windowStart, lte: windowEnd } },
    });

    if (!activeMatch) {
      return Response.json({
        ok: true,
        skipped: true,
        reason: "no matches in window",
        durationMs: Date.now() - started,
      });
    }

    const apiKey = process.env.FOOTBALL_DATA_API_KEY ?? "";
    const res = await fetch(`${API_BASE}/competitions/WC/matches`, {
      headers: { "X-Auth-Token": apiKey },
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`football-data.org → ${res.status}`);

    const data = await res.json() as Record<string, unknown>;
    const matches = (data.matches ?? []) as Array<Record<string, unknown>>;

    let updated = 0;
    for (const m of matches) {
      const fullTime = (m.score as Record<string, unknown>)?.fullTime as Record<string, unknown> | null;
      const result = await prisma.match.updateMany({
        where: { externalId: Number(m.id) },
        data: {
          status: String(m.status),
          homeScore: fullTime?.home != null ? Number(fullTime.home) : null,
          awayScore: fullTime?.away != null ? Number(fullTime.away) : null,
        },
      });
      updated += result.count;
    }

    revalidatePath("/matches");

    return Response.json({ ok: true, updated, durationMs: Date.now() - started });
  } catch (err) {
    console.error("[cron/scores]", err);
    return Response.json(
      { ok: false, error: String(err), durationMs: Date.now() - started },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
