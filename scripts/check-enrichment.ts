import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const [total, noPhoto, noClub, noAFId] = await Promise.all([
    prisma.player.count(),
    prisma.player.count({ where: { photo: null } }),
    prisma.player.count({ where: { currentClub: null } }),
    prisma.player.count({ where: { apiFootballId: null } }),
  ]);
  console.log(JSON.stringify({ total, noPhoto, noClub, noAFId }));
}
main().finally(() => prisma.$disconnect());
