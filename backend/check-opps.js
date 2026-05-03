const prisma = require('./src/config/prisma');

async function check() {
  try {
    const allRfqs = await prisma.rFQ.findMany({
      where: {
        status: { in: ['PENDING', 'SEARCHING', 'QUOTED'] }
      },
      include: { client: { select: { id: true } } },
      orderBy: { createdAt: 'desc' }
    });

    console.log("All Open RFQs:");
    allRfqs.forEach(r => console.log(`ID: ${r.id}, Cat: ${r.category}, Status: ${r.status}`));

    const supplier = await prisma.user.findFirst({
      where: { email: { contains: 'newshun' } },
      include: { approvedApplication: true }
    });

    if (!supplier) return console.log("Supplier not found");

    console.log("\nSupplier Category:", supplier.approvedApplication?.category);
    const app = supplier.approvedApplication;

    const normalize = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : '';
    const supplierCats = app.category ? app.category.split(',').map(normalize) : [];

    console.log("Normalized Supplier Cats:", supplierCats);

    const rfqs = allRfqs.filter(rfq => {
      if (!rfq.category) return false;
      const rfqCat = normalize(rfq.category);
      const isMatch = supplierCats.some(c => c.includes(rfqCat) || rfqCat.includes(c));
      console.log(`Checking RFQ ${r.id} (${rfqCat}) against supplier cats... match: ${isMatch}`);
      return isMatch;
    });

    console.log("\nMatched RFQs:", rfqs.length);
  } finally {
    await prisma.$disconnect();
  }
}
check();
