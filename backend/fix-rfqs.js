const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    where: { rfq: null },
    take: 2 
  });

  if (orders.length > 0) {
    const o1 = orders[0];
    await prisma.rFQ.create({
      data: {
        rfqNumber: 'RFQ-MOCK-' + o1.id,
        clientId: o1.clientId,
        title: 'Cajas de empaque personalizadas',
        description: 'Mock para probar la vista',
        quantity: 5000,
        status: 'APPROVED',
        orderId: o1.id,
        images: JSON.stringify(["https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=400"])
      }
    });
    console.log("Convertido orden", o1.id, "a Cotización.");
  }

  if (orders.length > 1) {
    const o2 = orders[1];
    await prisma.rFQ.create({
      data: {
        rfqNumber: 'RFQ-MOCK-' + o2.id,
        clientId: o2.clientId,
        title: 'Lotes de botellas de vidrio',
        description: 'Mock para probar la vista',
        quantity: 2000,
        status: 'APPROVED',
        orderId: o2.id,
        images: JSON.stringify(["https://images.unsplash.com/photo-1598514982205-f36b96d1e8dd?auto=format&fit=crop&q=80&w=400"])
      }
    });
    console.log("Convertido orden", o2.id, "a Cotización.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
