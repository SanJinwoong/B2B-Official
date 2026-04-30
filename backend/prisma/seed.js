/**
 * seed.js — Datos de prueba para el Dashboard Cliente
 * Ejecutar: node prisma/seed.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Ejecutando seed...');

  // ── 1. Admin ──────────────────────────────────────────────────────────────
  const adminPw = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { id: 999 },
    update: {},
    create: {
      id: 999,
      name: 'Admin Sistema',
      email: 'admin@b2bplatform.com',
      password: adminPw,
      role: 'ADMIN',
      profileCompleted: true,
    },
  });

  // ── 2. Cliente de prueba ──────────────────────────────────────────────────
  const clientPw = await bcrypt.hash('cliente123', 10);
  const client = await prisma.user.upsert({
    where: { id: 1000 },
    update: {},
    create: {
      id: 1000,
      name: 'María González',
      email: 'maria@distribuidoradelnorte.com',
      password: clientPw,
      role: 'CLIENT',
      phone: '+52 81 1234 5678',
      profileCompleted: true,
    },
  });

  // Perfil empresarial
  await prisma.clientProfile.upsert({
    where: { userId: client.id },
    update: {},
    create: {
      userId: client.id,
      companyName: 'Distribuidora del Norte',
      taxId: 'DNO920115AB3',
      businessType: 'Mayorista',
      commercialAddress: 'Av. Industrial 1450, Monterrey, NL',
      shippingAddress: 'Blvd. Logística 890, Apodaca, NL',
      website: 'https://distribuidoradelnorte.com',
    },
  });

  // ── 3. Pedidos confirmados ────────────────────────────────────────────────
  const now = new Date();
  const daysAgo  = (d) => new Date(now - d * 86400000);
  const daysAhead = (d) => new Date(now.getTime() + d * 86400000);

  // ORD-2026-031 — Control de Calidad (Fase 3)
  const ord031 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2026-031',
      clientId: client.id,
      status: 'QUALITY_CONTROL',
      totalAmount: 28500,
      clientAmount: 28500,
      sampleStatus: null,
      deliveryDate: daysAhead(20),
      phases: {
        create: [
          { phase: 'INITIAL_PAYMENT', phaseNumber: 1, status: 'DONE',        completedAt: daysAgo(30) },
          { phase: 'PRODUCTION',      phaseNumber: 2, status: 'DONE',        completedAt: daysAgo(10) },
          { phase: 'QUALITY_CONTROL', phaseNumber: 3, status: 'IN_PROGRESS'                            },
          { phase: 'SHIPPING',        phaseNumber: 4, status: 'PENDING'                                },
          { phase: 'DELIVERED',       phaseNumber: 5, status: 'PENDING'                                },
        ],
      },
      documents: {
        create: [
          { type: 'PROFORMA',     label: 'Factura Proforma',       fileUrl: 'https://example.com/docs/proforma-031.pdf'     },
          { type: 'PACKING_LIST', label: 'Packing List',           fileUrl: 'https://example.com/docs/packing-031.pdf'      },
          { type: 'QUALITY_CERT', label: 'Certificado de Calidad', fileUrl: 'https://example.com/docs/qc-031.pdf'           },
        ],
      },
      payments: {
        create: [
          { invoiceNumber: 'FAC-2026-031-A', type: 'DEPOSIT', percentage: 50, amount: 14250, status: 'PAID',    paidAt: daysAgo(28) },
          { invoiceNumber: 'FAC-2026-031-B', type: 'BALANCE', percentage: 50, amount: 14250, status: 'PENDING', dueDate: daysAhead(4) },
        ],
      },
    },
  });

  // ORD-2026-019 — En Tránsito (Fase 4)
  const ord019 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2026-019',
      clientId: client.id,
      status: 'IN_TRANSIT',
      totalAmount: 25500,
      clientAmount: 25500,
      sampleStatus: null,
      deliveryDate: daysAhead(7),
      phases: {
        create: [
          { phase: 'INITIAL_PAYMENT', phaseNumber: 1, status: 'DONE', completedAt: daysAgo(50) },
          { phase: 'PRODUCTION',      phaseNumber: 2, status: 'DONE', completedAt: daysAgo(25) },
          { phase: 'QUALITY_CONTROL', phaseNumber: 3, status: 'DONE', completedAt: daysAgo(10) },
          { phase: 'SHIPPING',        phaseNumber: 4, status: 'IN_PROGRESS'                    },
          { phase: 'DELIVERED',       phaseNumber: 5, status: 'PENDING'                        },
        ],
      },
      documents: {
        create: [
          { type: 'PROFORMA',       label: 'Factura Proforma',       fileUrl: 'https://example.com/docs/proforma-019.pdf' },
          { type: 'PACKING_LIST',   label: 'Packing List',           fileUrl: 'https://example.com/docs/packing-019.pdf' },
          { type: 'QUALITY_CERT',   label: 'Certificado de Calidad', fileUrl: 'https://example.com/docs/qc-019.pdf'      },
          { type: 'BILL_OF_LADING', label: 'Bill of Lading (B/L)',   fileUrl: 'https://example.com/docs/bl-019.pdf'      },
        ],
      },
      payments: {
        create: [
          { invoiceNumber: 'FAC-2026-019-A', type: 'DEPOSIT', percentage: 50, amount: 12750, status: 'PAID',    paidAt: daysAgo(48) },
          { invoiceNumber: 'FAC-2026-019-B', type: 'BALANCE', percentage: 50, amount: 12750, status: 'OVERDUE', dueDate: daysAgo(5)  },
        ],
      },
    },
  });

  // ORD-2026-008 — Entregado (Fase 5)
  await prisma.order.create({
    data: {
      orderNumber: 'ORD-2026-008',
      clientId: client.id,
      status: 'DELIVERED',
      totalAmount: 12800,
      clientAmount: 12800,
      sampleStatus: null,
      deliveryDate: daysAgo(15),
      phases: {
        create: [
          { phase: 'INITIAL_PAYMENT', phaseNumber: 1, status: 'DONE', completedAt: daysAgo(80) },
          { phase: 'PRODUCTION',      phaseNumber: 2, status: 'DONE', completedAt: daysAgo(50) },
          { phase: 'QUALITY_CONTROL', phaseNumber: 3, status: 'DONE', completedAt: daysAgo(30) },
          { phase: 'SHIPPING',        phaseNumber: 4, status: 'DONE', completedAt: daysAgo(20) },
          { phase: 'DELIVERED',       phaseNumber: 5, status: 'DONE', completedAt: daysAgo(15) },
        ],
      },
      documents: {
        create: [
          { type: 'PROFORMA',       label: 'Factura Proforma',       fileUrl: 'https://example.com/docs/proforma-008.pdf' },
          { type: 'PACKING_LIST',   label: 'Packing List',           fileUrl: 'https://example.com/docs/packing-008.pdf'  },
          { type: 'QUALITY_CERT',   label: 'Certificado de Calidad', fileUrl: 'https://example.com/docs/qc-008.pdf'       },
          { type: 'BILL_OF_LADING', label: 'Bill of Lading (B/L)',   fileUrl: 'https://example.com/docs/bl-008.pdf'       },
        ],
      },
      payments: {
        create: [
          { invoiceNumber: 'FAC-2026-008', type: 'FULL', percentage: 100, amount: 12800, status: 'PAID', paidAt: daysAgo(75) },
        ],
      },
    },
  });

  // ORD-2026-035 — En Producción + Muestra por aprobar (Fase 2)
  await prisma.order.create({
    data: {
      orderNumber: 'ORD-2026-035',
      clientId: client.id,
      status: 'IN_PRODUCTION',
      totalAmount: 31000,
      clientAmount: 31000,
      sampleStatus: 'PENDING',
      deliveryDate: daysAhead(35),
      phases: {
        create: [
          { phase: 'INITIAL_PAYMENT', phaseNumber: 1, status: 'DONE',        completedAt: daysAgo(15) },
          { phase: 'PRODUCTION',      phaseNumber: 2, status: 'IN_PROGRESS'                            },
          { phase: 'QUALITY_CONTROL', phaseNumber: 3, status: 'PENDING'                                },
          { phase: 'SHIPPING',        phaseNumber: 4, status: 'PENDING'                                },
          { phase: 'DELIVERED',       phaseNumber: 5, status: 'PENDING'                                },
        ],
      },
      payments: {
        create: [
          { invoiceNumber: 'FAC-2026-035-A', type: 'DEPOSIT', percentage: 40, amount: 12400, status: 'PAID',    paidAt: daysAgo(13) },
          { invoiceNumber: 'FAC-2026-035-B', type: 'BALANCE', percentage: 60, amount: 18600, status: 'PENDING', dueDate: daysAhead(22) },
        ],
      },
    },
  });

  // ── 4. RFQs ───────────────────────────────────────────────────────────────

  // RFQ-041 — Lista para revisar (QUOTED) con 2 opciones — vinculado al flujo
  const rfq041 = await prisma.rFQ.create({
    data: {
      rfqNumber: 'RFQ-2026-041',
      clientId: client.id,
      title: 'Cajas de cartón corrugado',
      description: 'Cajas 30x20x15 cm, doble capa, impresas a 2 colores con logo',
      quantity: 5000,
      unit: 'piezas',
      status: 'QUOTED',
      quotes: {
        create: [
          {
            label: 'Opción A',
            supplierName: 'Fábrica Nacional (MX)',
            supplierCountry: 'México',
            unitPrice: 8.50,
            totalPrice: 42500,
            deliveryDays: 18,
            moq: 1000,
            notes: 'Entrega incluida. Material 100% reciclable certificado.',
            validUntil: daysAhead(10),
          },
          {
            label: 'Opción B',
            supplierName: 'PackPro Guangzhou (CN)',
            supplierCountry: 'China',
            unitPrice: 5.90,
            totalPrice: 29500,
            deliveryDays: 35,
            moq: 3000,
            notes: 'Flete marítimo a cargo del cliente. Requiere pago 70/30.',
            validUntil: daysAhead(10),
          },
        ],
      },
    },
  });

  // RFQ-038 — En búsqueda
  await prisma.rFQ.create({
    data: {
      rfqNumber: 'RFQ-2026-038',
      clientId: client.id,
      title: 'Etiquetas adhesivas personalizadas',
      quantity: 20000,
      unit: 'piezas',
      status: 'SEARCHING',
    },
  });

  // RFQ-029 — Convertida a pedido (ORD-031)
  await prisma.rFQ.create({
    data: {
      rfqNumber: 'RFQ-2026-029',
      clientId: client.id,
      title: 'Bolsas de polietileno con zipper',
      quantity: 10000,
      unit: 'piezas',
      status: 'APPROVED',
      orderId: ord031.id,
    },
  });

  // RFQ-021 — Expirada
  await prisma.rFQ.create({
    data: {
      rfqNumber: 'RFQ-2026-021',
      clientId: client.id,
      title: 'Stretch film industrial',
      quantity: 200,
      unit: 'rollos',
      status: 'EXPIRED',
    },
  });

  // RFQ-045 — Lista para revisar + Acción requerida (QUOTED)
  await prisma.rFQ.create({
    data: {
      rfqNumber: 'RFQ-2026-045',
      clientId: client.id,
      title: 'Empaque biodegradable kraft',
      quantity: 8000,
      unit: 'piezas',
      status: 'QUOTED',
      quotes: {
        create: [
          {
            label: 'Opción A',
            supplierName: 'EcoPackMX',
            supplierCountry: 'México',
            unitPrice: 4.20,
            totalPrice: 33600,
            deliveryDays: 22,
            moq: 2000,
            notes: 'Certificación FSC. Entrega incluida CDMX.',
            validUntil: daysAhead(5),
          },
        ],
      },
    },
  });

  // ── 5. Mensajes ───────────────────────────────────────────────────────────
  await prisma.message.createMany({
    data: [
      { clientId: client.id, senderId: admin.id,  content: '¡Hola María! Hemos recibido tu solicitud RFQ-2026-041. Ya estamos buscando proveedores.', isRead: true,  createdAt: daysAgo(5) },
      { clientId: client.id, senderId: client.id, content: 'Perfecto, gracias. ¿En cuánto tiempo tienen respuesta?',                                    isRead: true,  createdAt: daysAgo(5) },
      { clientId: client.id, senderId: admin.id,  content: 'Normalmente entre 3-5 días hábiles. Ya tenemos dos opciones listas para tu revisión.',       isRead: true,  createdAt: daysAgo(3) },
      { clientId: client.id, senderId: admin.id,  content: 'Ya puedes revisar las cotizaciones en la sección Cotizaciones. ¡Cualquier duda estamos aquí!', isRead: false, createdAt: daysAgo(1) },
    ],
  });

  console.log('✅ Seed completado.');
  console.log('');
  console.log('  👤 Cliente: maria@distribuidoradelnorte.com / cliente123');
  console.log('  🛡️  Admin:  admin@b2bplatform.com / admin123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
