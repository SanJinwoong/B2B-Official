const svc = require('./src/services/supplier-portal.service');
const prisma = require('./src/config/prisma');

async function test() {
  const supplier = await prisma.user.findFirst({
    where: { email: { contains: 'newshun' } }
  });
  console.log("Supplier ID:", supplier.id);
  const opps = await svc.getOpportunities(supplier.id);
  console.log("Found opportunities:", opps.length);
  opps.forEach(o => console.log(o.id, o.title, o.category));
  await prisma.$disconnect();
}
test().catch(console.error);
