const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

const now = new Date();
const daysAhead = (d) => new Date(now.getTime() + d * 86400000);

async function main() {
  // Obtener los suppliers aprobados con su companyName
  const apps = await p.supplierApplication.findMany({
    where: { status: 'APPROVED' },
    select: { approvedUserId: true, companyName: true, country: true }
  });

  const supplierData = [...apps];

  // Crear 3 suppliers extra si aun no existen
  const extraSuppliers = [
    { name: 'Soluciones Industriales Bajío', email: 'seed_sup1@test.com', company: 'Soluciones Industriales del Bajío' },
    { name: 'NovaPack Guadalajara', email: 'seed_sup2@test.com', company: 'NovaPack Guadalajara S.A.' },
    { name: 'Manufactura Integral CDMX', email: 'seed_sup3@test.com', company: 'Manufactura Integral CDMX' },
  ];

  const pw = await bcrypt.hash('proveedor123', 10);

  for (const s of extraSuppliers) {
    // Buscar si ya existe por email
    let user = await p.user.findFirst({ where: { email: s.email } });
    if (!user) {
      user = await p.user.create({
        data: { name: s.name, email: s.email, password: pw, role: 'SUPPLIER', profileCompleted: true }
      });
      console.log(`  + Usuario creado: ${s.name} (ID: ${user.id})`);
    }

    // Buscar o crear supplierApplication
    let existing = await p.supplierApplication.findFirst({ where: { approvedUserId: user.id } });
    if (!existing) {
      await p.supplierApplication.create({
        data: {
          approvedUserId: user.id,
          companyName: s.company,
          status: 'APPROVED',
          category: 'empaques,manufactura',
          country: 'México',
          state: 'Jalisco',
          city: 'Guadalajara',
          contactEmail: s.email,
          contactName: s.name,
          contactPhone: '+52 33 1234 5678',
          rfc: `SEED${user.id}XXXX`,
          monthlyCapacity: 50000,
          capacityUnit: 'piezas',
          leadTimeDays: 15,
        }
      });
      console.log(`  + Application creada para: ${s.company}`);
    }

    if (!supplierData.find(d => d.approvedUserId === user.id)) {
      supplierData.push({ approvedUserId: user.id, companyName: s.company, country: 'México' });
    }
  }

  console.log(`\nTotal suppliers disponibles: ${supplierData.length}`);

  // Buscar RFQs activos
  const rfqs = await p.rFQ.findMany({
    where: { status: { in: ['PENDING', 'SEARCHING', 'QUOTED'] } },
    include: { quotes: { select: { supplierId: true } } },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`RFQs activos encontrados: ${rfqs.length}\n`);

  let totalInserted = 0;

  const noteOptions = [
    'Precio incluye flete terrestre. Anticipo del 50%.',
    'Entrega garantizada en tiempo. Material de primera calidad.',
    'Incluye muestras sin costo. Certificación ISO disponible.',
    'Factura electrónica incluida. Pago a 30 días para clientes frecuentes.',
  ];

  for (const rfq of rfqs) {
    const existingSupplierIds = rfq.quotes.map(q => q.supplierId);
    const available = supplierData.filter(s => !existingSupplierIds.includes(s.approvedUserId));

    if (available.length === 0) {
      console.log(`↩️  ${rfq.rfqNumber} — Ya tiene propuestas de todos los proveedores disponibles`);
      continue;
    }

    const toInsert = available.slice(0, 3);
    const baseUnit = rfq.budget ? rfq.budget / rfq.quantity : 12 + Math.random() * 25;

    for (let i = 0; i < toInsert.length; i++) {
      const s = toInsert[i];
      const factor = 0.80 + (i * 0.09) + (Math.random() * 0.08);
      const unitPrice = parseFloat((baseUnit * factor).toFixed(2));
      const totalPrice = parseFloat((unitPrice * rfq.quantity).toFixed(2));
      const deliveryDays = 8 + (i * 6) + Math.floor(Math.random() * 4);

      try {
        await p.rFQQuote.create({
          data: {
            rfqId: rfq.id,
            supplierId: s.approvedUserId,
            supplierName: s.companyName,
            supplierCountry: s.country || 'México',
            label: `Opción ${String.fromCharCode(65 + i + existingSupplierIds.length)}`,
            unitPrice,
            totalPrice,
            deliveryDays,
            moq: Math.max(50, Math.floor(rfq.quantity * 0.15)),
            notes: noteOptions[i % noteOptions.length],
            validUntil: daysAhead(7 + i * 3),
          }
        });
        console.log(`✅ ${rfq.rfqNumber} — "${s.companyName}" → $${totalPrice.toLocaleString()} MXN | ${deliveryDays} días`);
        totalInserted++;
      } catch (err) {
        console.log(`⚠️  ${rfq.rfqNumber} — Error con "${s.companyName}": ${err.message.split('\n')[0]}`);
      }
    }

    // Actualizar a QUOTED si aún no lo está
    if (rfq.status !== 'QUOTED') {
      await p.rFQ.update({ where: { id: rfq.id }, data: { status: 'QUOTED' } });
      console.log(`🔄 ${rfq.rfqNumber} → estado actualizado a QUOTED`);
    }
  }

  console.log(`\n✅ Seed completo. ${totalInserted} propuestas insertadas.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
