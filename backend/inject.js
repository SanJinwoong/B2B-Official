const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const adminPw = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { id: 100 },
    update: { email: 'admin@gmail.com', password: adminPw, role: 'ADMIN' },
    create: { id: 100, name: 'Admin', email: 'admin@gmail.com', password: adminPw, role: 'ADMIN' }
  });

  const clientPw = await bcrypt.hash('jinwoong123', 10);
  await prisma.user.upsert({
    where: { id: 101 },
    update: { email: 'jinwoong@gmail.com', password: clientPw, role: 'CLIENT' },
    create: { id: 101, name: 'Jinwoong', email: 'jinwoong@gmail.com', password: clientPw, role: 'CLIENT' }
  });

  const suppPw = await bcrypt.hash('shunwoo123', 10);
  // Ensure newshunwoo@gmail.com password is correct
  const supp = await prisma.user.findFirst({ where: { email: 'newshunwoo@gmail.com' } });
  if (supp) {
    await prisma.user.update({ where: { id: supp.id }, data: { password: suppPw } });
  }

  console.log("Users injected successfully.");
}
main().finally(() => prisma.$disconnect());
