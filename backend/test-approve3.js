const prisma = require('./src/config/prisma');

async function testApprove() {
  try {
    const rfqId = 6;
    const quoteId = 3;
    const clientId = 2;
    const quote = await prisma.rFQQuote.findUnique({ where: { id: quoteId } });
    
    console.log("Creating order...");
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-TEST-123',
        clientId,
        supplierId: quote.supplierId,
        status: 'IN_PRODUCTION',
        totalAmount: quote.totalPrice,
        clientAmount: quote.totalPrice,
        supplierAmount: quote.totalPrice,
        sampleStatus: 'PENDING',
        phases: {
          create: [{ phase: 'INITIAL_PAYMENT', phaseNumber: 1, status: 'DONE' }]
        },
        payments: {
          create: [{ invoiceNumber: 'FAC-TEST-A', type: 'DEPOSIT', percentage: 50, amount: 50000, status: 'PENDING' }]
        }
      }
    });
    console.log("Order created:", order.id);

    console.log("Updating RFQ Quote...");
    await prisma.rFQQuote.update({ where: { id: quoteId }, data: { isApproved: true } });
    console.log("Quote updated");

    console.log("Updating RFQ...");
    await prisma.rFQ.update({
      where: { id: rfqId },
      data: { status: 'APPROVED', orderId: order.id },
    });
    console.log("Success!");
  } catch (err) {
    console.error("Error Details:", err);
  } finally {
    await prisma.$disconnect();
  }
}
testApprove();
