const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.rFQ.updateMany({ data: { deadline: new Date(Date.now() + 15 * 86400000) } })
  .then(() => console.log('Deadlines updated'))
  .finally(() => p.$disconnect());
