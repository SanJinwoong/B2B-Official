const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({ include: { phases: true } });
  for (const order of orders) {
    if (order.status === 'DELIVERED') {
      await prisma.orderPhase.updateMany({
        where: { orderId: order.id },
        data: { status: 'DONE' }
      });
    } else if (order.status === 'IN_TRANSIT') {
      await prisma.orderPhase.updateMany({
        where: { orderId: order.id, phase: { in: ['INITIAL_PAYMENT', 'PRODUCTION', 'QUALITY_CONTROL', 'SHIPPING'] } },
        data: { status: 'DONE' }
      });
      await prisma.orderPhase.updateMany({
        where: { orderId: order.id, phase: 'DELIVERED' },
        data: { status: 'PENDING' }
      });
    } else if (order.status === 'QUALITY_CONTROL') {
      await prisma.orderPhase.updateMany({
        where: { orderId: order.id, phase: { in: ['INITIAL_PAYMENT', 'PRODUCTION'] } },
        data: { status: 'DONE' }
      });
      await prisma.orderPhase.updateMany({
        where: { orderId: order.id, phase: 'QUALITY_CONTROL' },
        data: { status: 'IN_PROGRESS' }
      });
    } else if (order.status === 'IN_PRODUCTION') {
      await prisma.orderPhase.updateMany({
        where: { orderId: order.id, phase: 'INITIAL_PAYMENT' },
        data: { status: 'DONE' }
      });
      await prisma.orderPhase.updateMany({
        where: { orderId: order.id, phase: 'PRODUCTION' },
        data: { status: 'IN_PROGRESS' }
      });
    } else if (order.status === 'PENDING') {
      await prisma.orderPhase.updateMany({
        where: { orderId: order.id, phase: 'INITIAL_PAYMENT' },
        data: { status: 'DONE' }
      });
      await prisma.orderPhase.updateMany({
        where: { orderId: order.id, phase: 'PRODUCTION' },
        data: { status: 'IN_PROGRESS' }
      });
    }
  }
  console.log('Fixed phases for all existing orders');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
