const rfqService = require('./src/services/rfq.service');
const prisma = require('./src/config/prisma');

async function testApprove() {
  try {
    const rfq = await prisma.rFQ.findFirst({
      where: { status: 'QUOTED' },
      include: { quotes: true }
    });
    if (!rfq) return console.log("No QUOTED RFQ found");
    console.log("Approving RFQ:", rfq.id, "Quote:", rfq.quotes[0].id);
    await rfqService.approveQuote(rfq.id, rfq.quotes[0].id, rfq.clientId);
    console.log("Success");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}
testApprove();
