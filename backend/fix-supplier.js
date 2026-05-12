const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.order.updateMany({
    where: { supplierId: null },
    data: { supplierId: 1001 }
  });
  console.log(`Updated ${count.count} orders to have supplierId 1001.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
