const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: { rfq: true, orderItems: true }
  });
  console.log(JSON.stringify(orders, null, 2));
}

main().finally(() => prisma.$disconnect());
