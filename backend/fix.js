const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.order.updateMany({
    data: { sampleStatus: null }
  });
  console.log('Updated sampleStatus to null for all orders');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
