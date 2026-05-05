const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findMany({ where: { role: 'SUPPLIER' }, select: { id: true, name: true, email: true } })
  .then(r => { console.log(JSON.stringify(r, null, 2)); return p.$disconnect(); });
