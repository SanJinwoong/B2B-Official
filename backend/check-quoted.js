const prisma = require('./src/config/prisma');

async function test() {
  const rfqs = await prisma.rFQ.findMany({ where: { status: 'QUOTED' }, include: { quotes: true } });
  console.log("QUOTED RFQs:", rfqs.length);
  if (rfqs.length > 0) {
    console.log("Quotes in first RFQ:", rfqs[0].quotes);
  }
  await prisma.$disconnect();
}
test();
