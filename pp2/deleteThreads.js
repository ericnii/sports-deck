const { PrismaClient } = require("./prisma/generated");

const prisma = new PrismaClient();

async function deleteSystemThreads() {
  try {
    const result = await prisma.thread.deleteMany({
      where: {
        author: { email: "system@sportsdeck.local" }
      }
    });
    console.log(`Deleted ${result.count} threads`);
  } catch (error) {
    console.error("Error deleting threads:", error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteSystemThreads();
