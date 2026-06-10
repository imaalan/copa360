export const runtime = "nodejs";
export const maxDuration = 60;

import { prisma } from "@/lib/prisma";
import { syncWorldCupData } from "@/lib/sync-core";

/**
 * /api/cron/seed — Sincronização diária (Vercel Cron, 06:00 UTC).
 * Mesma lógica do `npm run db:seed` via src/lib/sync-core.ts.
 * Nunca toca em campos de enriquecimento (fotos, bios, troféus, stats, nomes).
 */
export async function GET(req: Request) {
  // Vercel injects this header automatically on cron calls.
  // Manual calls without the secret are rejected.
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();

  try {
    const result = await syncWorldCupData(prisma);

    return Response.json({
      ok: true,
      durationMs: Date.now() - started,
      upserted: { teams: result.teams, players: result.players, matches: result.matches },
    });
  } catch (err) {
    console.error("[cron/seed]", err);
    return Response.json(
      { ok: false, error: String(err), durationMs: Date.now() - started },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
