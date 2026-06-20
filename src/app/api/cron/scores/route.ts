export const runtime = "nodejs";
export const maxDuration = 30;

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const API_BASE = "https://api.football-data.org/v4";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const now = new Date();
  // Janela: jogos das ultimas 4h ate as proximas 2h
  const windowStart = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  try {
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
    // Busca apenas jogos da janela ativa -- evita 100+ queries sequenciais
    const dateFrom = windowStart.toISOString().split("T")[0];
    const dateTo = windowEnd.toISOString().split("T")[0];
    const res = await fetch(
      `${API_BASE}/competitions/WC/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
    );

    if (!res.ok) throw new Error(`football-data.org -> ${res.status}`);

    const data = await res.json() as Record<string, unknown>;
    const matches = (data.matches ?? []) as Array<Record<string, unknown>>;

    // Updates em paralelo -- elimina gargalo de queries sequenciais
    const results = await Promise.all(
      matches.map((m) => {
        const fullTime = (m.score as Record<string, unknown>)?.fullTime as Record<string, unknown> | null;
        return prisma.match.updateMany({
          where: { externalId: Number(m.id) },
          data: {
            status: String(m.status),
            homeScore: fullTime?.home != null ? Number(fullTime.home) : null,
            awayScore: fullTime?.away != null ? Number(fullTime.away) : null,
          },
        });
      })
    );

    const updated = results.reduce((sum, r) => sum + r.count, 0);

    revalidatePath("/matches");

    return Response.json({ ok: true, updated, fetched: matches.length, durationMs: Date.now() - started });
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
