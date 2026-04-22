import { PrismaClient } from './prisma/generated/index.js';
const prisma = new PrismaClient();
async function main() {
  const polls = await prisma.poll.findMany({
    where: { threadId: 25, hidden: false },
    include: { author: { select: { username: true } } }
  });
  console.log("Success:", polls);
}
main().catch(console.error).finally(() => prisma.$disconnect());
