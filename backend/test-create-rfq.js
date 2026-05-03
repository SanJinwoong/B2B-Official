require('dotenv').config();
const prisma = require('./src/config/prisma');
const rfqService = require('./src/services/rfq.service');

async function run() {
  try {
    // Buscar un clientId valido para probar
    const client = await prisma.user.findFirst({ where: { role: 'CLIENT' } });
    if (!client) {
      console.log("No client found");
      return;
    }
    
    console.log("Creating RFQ for client:", client.id);
    const rfq = await rfqService.createRFQ(client.id, {
      title: 'Test',
      description: 'Test description',
      quantity: 100,
      unit: 'piezas',
      category: 'general',
      images: []
    });
    console.log("RFQ created successfully:", rfq);
  } catch (err) {
    console.error("ERROR CREATING RFQ:");
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
