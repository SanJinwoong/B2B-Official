const rfqService = require('./src/services/rfq.service');
const prisma = require('./src/config/prisma');

async function testApprove() {
  try {
    const rfq = await prisma.rFQ.findUnique({
      where: { id: 6 },
      include: { quotes: true }
    });
    console.log("Approving RFQ:", rfq.id, "Quote:", 3, "ClientId:", rfq.clientId);
    const order = await rfqService.approveQuote(6, 3, rfq.clientId);
    console.log("Success! Order ID:", order.id);
  } catch (err) {
    console.error("Error Details:", err);
  } finally {
    await prisma.$disconnect();
  }
}
testApprove();
