const prisma = require('./src/config/prisma');
async function run() {
  const users = await prisma.user.findMany({
    where: { email: { contains: 'newshun' } },
    include: { approvedApplication: true }
  });
  console.log(JSON.stringify(users.map(u => ({
    email: u.email,
    category: u.approvedApplication?.category
  })), null, 2));
  await prisma.$disconnect();
}
run();
