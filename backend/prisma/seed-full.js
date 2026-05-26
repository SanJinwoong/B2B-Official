/**
 * seed-full.js — 20 productos con imágenes + pedidos + cotizaciones
 * Ejecutar: node prisma/seed-full.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const IMG = (name) => `http://localhost:5173/products/${name}`;

const PRODUCTS = [
  { name:'Cajas de Cartón Corrugado',desc:'Cajas 30x20x15 cm doble capa, impresas a 2 colores',price:8.50,sp:5.20,stock:5000,cat:'empaques',moq:500,lead:12,unit:'piezas',img:'cardboard_boxes.png',brand:'PackMX',tags:['cartón','corrugado','envío'],specs:{material:'Cartón corrugado',grosor:'3mm',resistencia:'32 ECT'}},
  { name:'Bolsas Kraft Biodegradables',desc:'Bolsas papel kraft con asa trenzada, múltiples tamaños',price:4.20,sp:2.80,stock:10000,cat:'empaques',moq:1000,lead:10,unit:'piezas',img:'kraft_bags.png',brand:'EcoPackMX',tags:['kraft','biodegradable','ecológico'],specs:{material:'Papel kraft 120g',certificación:'FSC'}},
  { name:'Bolsas Polietileno con Zipper',desc:'Bolsas transparentes resellables, grado alimenticio',price:1.80,sp:1.10,stock:20000,cat:'empaques',moq:2000,lead:8,unit:'piezas',img:'ziplock_bags.png',brand:'PlastiSeal',tags:['polietileno','zipper','resellable'],specs:{material:'LDPE',grosor:'80 micras'}},
  { name:'Stretch Film Industrial',desc:'Película estirable para paletizado, alta adherencia',price:185,sp:120,stock:500,cat:'empaques',moq:10,lead:5,unit:'rollos',img:'stretch_film.png',brand:'WrapPro',tags:['stretch','paletizado','embalaje'],specs:{ancho:'50cm',largo:'300m',grosor:'23 micras'}},
  { name:'Etiquetas Adhesivas Personalizadas',desc:'Etiquetas impresas full color en rollo, acabado glossy',price:0.45,sp:0.22,stock:50000,cat:'empaques',moq:5000,lead:15,unit:'piezas',img:'adhesive_labels.png',brand:'LabelPrint',tags:['etiquetas','adhesivas','branding'],specs:{material:'BOPP',acabado:'Glossy UV'}},
  { name:'Piezas CNC Acero Inoxidable',desc:'Componentes maquinados de precisión, tolerancia ±0.01mm',price:125,sp:78,stock:200,cat:'manufactura',moq:50,lead:25,unit:'piezas',img:'steel_parts.png',brand:'MetalTech',tags:['CNC','acero','precisión'],specs:{material:'Acero 304',tolerancia:'±0.01mm'}},
  { name:'Plástico Burbuja Protector',desc:'Rollo de plástico burbuja para protección de envíos',price:95,sp:62,stock:800,cat:'empaques',moq:5,lead:4,unit:'rollos',img:'bubble_wrap.png',brand:'BubbleSafe',tags:['burbuja','protección','envío'],specs:{burbuja:'10mm',ancho:'60cm',largo:'100m'}},
  { name:'Café Orgánico de Altura',desc:'Café de especialidad, origen Chiapas, tueste medio-oscuro',price:220,sp:145,stock:300,cat:'alimentos',moq:10,lead:7,unit:'kg',img:'organic_coffee.png',brand:'CaféAltura',tags:['café','orgánico','chiapas'],specs:{origen:'Chiapas MX',altitud:'1400 msnm',tueste:'Medio-oscuro'}},
  { name:'Tela Algodón Premium 100%',desc:'Rollos de algodón peinado para confección industrial',price:85,sp:55,stock:150,cat:'textiles',moq:20,lead:14,unit:'metros',img:'cotton_fabric.png',brand:'TextilMX',tags:['algodón','tela','confección'],specs:{composición:'100% algodón peinado',gramaje:'180 g/m²'}},
  { name:'Desengrasante Industrial Concentrado',desc:'Limpiador multiusos biodegradable para uso industrial',price:350,sp:210,stock:100,cat:'quimicos',moq:5,lead:6,unit:'litros',img:'cleaning_chemicals.png',brand:'QuimClean',tags:['desengrasante','industrial','biodegradable'],specs:{pH:'11.5',concentración:'1:20'}},
  { name:'Contenedores Plásticos Grado Alimenticio',desc:'Envases con tapa hermética, apilables, BPA free',price:12.50,sp:7.80,stock:3000,cat:'empaques',moq:200,lead:10,unit:'piezas',img:'plastic_containers.png',brand:'FoodSafe',tags:['contenedor','BPA-free','hermético'],specs:{material:'PP grado 5',capacidad:'1 litro'}},
  { name:'Papel Aluminio Industrial',desc:'Rollos de aluminio para cocina industrial y empaque',price:280,sp:175,stock:200,cat:'empaques',moq:10,lead:8,unit:'rollos',img:'aluminum_foil.png',brand:'AluWrap',tags:['aluminio','cocina','empaque'],specs:{grosor:'18 micras',ancho:'45cm',largo:'150m'}},
  { name:'Guantes de Seguridad Industrial',desc:'Guantes anticorte nivel 5, recubierto de nitrilo',price:45,sp:28,stock:2000,cat:'manufactura',moq:100,lead:7,unit:'piezas',img:'safety_gloves.png',brand:'SafeHand',tags:['guantes','seguridad','nitrilo'],specs:{nivel_corte:'A5',material:'HPPE + nitrilo'}},
  { name:'Tarjetas de Circuito Impreso (PCB)',desc:'PCBs multicapa para electrónica, FR-4 de alta calidad',price:35,sp:18,stock:500,cat:'electronica',moq:50,lead:20,unit:'piezas',img:'pcb_boards.png',brand:'CircuitPro',tags:['PCB','electrónica','circuito'],specs:{capas:'4 capas',material:'FR-4',acabado:'HASL'}},
  { name:'Pouches Stand-Up Metalizados',desc:'Bolsas doypack con zipper para alimentos, barrera alta',price:3.80,sp:2.20,stock:15000,cat:'empaques',moq:1000,lead:12,unit:'piezas',img:'food_packaging.png',brand:'DoyPack',tags:['doypack','metalizado','alimentos'],specs:{material:'PET/AL/PE',barrera:'Alta'}},
  { name:'Tarimas de Madera Estándar',desc:'Tarimas de pino 120x100cm, tratamiento fitosanitario',price:180,sp:110,stock:300,cat:'logistica',moq:20,lead:5,unit:'piezas',img:'wooden_pallets.png',brand:'PalletMX',tags:['tarima','madera','logística'],specs:{dimensiones:'120x100x15 cm',tratamiento:'NIMF-15'}},
  { name:'Cemento Portland CPC 30R',desc:'Cemento de alta resistencia para construcción general',price:165,sp:105,stock:1000,cat:'construccion',moq:50,lead:3,unit:'sacos',img:'cement_bags.png',brand:'CementosMX',tags:['cemento','construcción','portland'],specs:{tipo:'CPC 30R',peso:'50kg/saco'}},
  { name:'Cinta de Empaque Transparente',desc:'Cinta adhesiva BOPP para sellado de cajas, 48mm x 150m',price:22,sp:13,stock:5000,cat:'empaques',moq:100,lead:4,unit:'rollos',img:'adhesive_labels.png',brand:'TapePro',tags:['cinta','empaque','sellado'],specs:{ancho:'48mm',largo:'150m',adhesivo:'Acrílico'}},
  { name:'Aceite de Aguacate Extra Virgen',desc:'Aceite prensado en frío, grado gourmet para exportación',price:195,sp:120,stock:400,cat:'alimentos',moq:20,lead:10,unit:'litros',img:'organic_coffee.png',brand:'AvoOil',tags:['aguacate','aceite','gourmet'],specs:{acidez:'< 0.5%',extracción:'Prensado en frío'}},
  { name:'Malla Sombra Agrícola',desc:'Malla raschel 50% sombra para invernaderos y cultivos',price:38,sp:22,stock:800,cat:'otros',moq:50,lead:7,unit:'metros',img:'cotton_fabric.png',brand:'AgroMesh',tags:['malla','sombra','agrícola'],specs:{sombra:'50%',material:'HDPE',ancho:'4m'}},
];

async function main() {
  console.log('🌱 Seed completo — 20 productos + pedidos + cotizaciones...\n');

  // ── 1. Usuarios ──
  const pw = await bcrypt.hash('admin123', 10);
  const cpw = await bcrypt.hash('cliente123', 10);
  const spw = await bcrypt.hash('proveedor123', 10);

  const admin = await prisma.user.upsert({
    where: { id: 999 }, update: {},
    create: { id:999, name:'Admin Sistema', email:'admin@b2bplatform.com', password:pw, role:'ADMIN', profileCompleted:true },
  });

  const supplier1 = await prisma.user.upsert({
    where: { id: 2001 }, update: {},
    create: { id:2001, name:'Carlos Herrera', email:'carlos@empaquesindustriales.com', password:spw, role:'SUPPLIER', profileCompleted:true, phone:'+52 55 9876 5432' },
  });

  const supplier2 = await prisma.user.upsert({
    where: { id: 2002 }, update: {},
    create: { id:2002, name:'Ana López', email:'ana@metaltech.com', password:spw, role:'SUPPLIER', profileCompleted:true, phone:'+52 81 5555 1234' },
  });

  const supplier3 = await prisma.user.upsert({
    where: { id: 2003 }, update: {},
    create: { id:2003, name:'Roberto Sánchez', email:'roberto@alimentos-mx.com', password:spw, role:'SUPPLIER', profileCompleted:true, phone:'+52 33 4444 5678' },
  });

  const client = await prisma.user.upsert({
    where: { id: 1000 }, update: {},
    create: { id:1000, name:'María González', email:'maria@distribuidoradelnorte.com', password:cpw, role:'CLIENT', phone:'+52 81 1234 5678', profileCompleted:true },
  });

  // ── Generar 20 usuarios extra de cada tipo para demo ──
  console.log('  Generando datos adicionales (20 Admins, 20 Scouters, 20 Clientes, 20 Proveedores)...');
  
  for (let i = 1; i <= 20; i++) {
    // 20 Admins adicionales
    await prisma.user.upsert({
      where: { id: 900 + i }, update: {},
      create: { id: 900 + i, name:`Admin Auxiliar ${i}`, email:`admin${i}@b2bplatform.com`, password:pw, role:'ADMIN', profileCompleted:true }
    });

    // 20 Scouters
    await prisma.user.upsert({
      where: { id: 3000 + i }, update: {},
      create: { id: 3000 + i, name:`Agente Scouter ${i}`, email:`scouter${i}@b2bplatform.com`, password:pw, role:'SCOUTER', profileCompleted:true, phone:`+52 81 0000 30${i.toString().padStart(2, '0')}` }
    });

    // 20 Clientes
    const dummyClient = await prisma.user.upsert({
      where: { id: 1000 + i }, update: {},
      create: { id: 1000 + i, name:`Cliente PyME ${i} Tamaulipas`, email:`cliente${i}@tamaulipas-pyme.com`, password:cpw, role:'CLIENT', profileCompleted:true, phone:`+52 83 4000 10${i.toString().padStart(2, '0')}` }
    });

    await prisma.clientProfile.upsert({
      where: { userId: dummyClient.id }, update: {},
      create: { userId: dummyClient.id, companyName:`Empresa Cliente ${i} SA de CV`, taxId:`CLI${i}010101AAA`, businessType:'Retail', commercialAddress:`Av. Principal ${i}, Cd. Victoria, Tamps`, shippingAddress:`Av. Principal ${i}, Cd. Victoria, Tamps`, website:`https://cliente${i}.com` }
    });

    // 20 Proveedores
    const dummySupplier = await prisma.user.upsert({
      where: { id: 2003 + i }, update: {},
      create: { id: 2003 + i, name:`Proveedor Verificado ${i}`, email:`proveedor${i}@industrial-mx.com`, password:spw, role:'SUPPLIER', profileCompleted:true, phone:`+52 55 0000 20${i.toString().padStart(2, '0')}` }
    });

    await prisma.supplierApplication.upsert({
      where: { approvedUserId: dummySupplier.id }, update: {},
      create: { companyName:`Fábrica Proveedora ${i} SA`, rfc:`PRO${i}010101AAA`, category:'manufactura', contactName:`Proveedor Verificado ${i}`, contactEmail:`proveedor${i}@industrial-mx.com`, contactPhone:`+52 55 0000 20${i.toString().padStart(2, '0')}`, country:'México', state:'Nuevo León', city:'Monterrey', monthlyCapacity:5000, capacityUnit:'piezas', leadTimeDays:10, status:'APPROVED', approvedUserId:dummySupplier.id },
    });
  }

  // ── Perfil empresarial ──
  await prisma.clientProfile.upsert({
    where: { userId: client.id }, update: {},
    create: { userId:client.id, companyName:'Distribuidora del Norte', taxId:'DNO920115AB3', businessType:'Mayorista', commercialAddress:'Av. Industrial 1450, Monterrey, NL', shippingAddress:'Blvd. Logística 890, Apodaca, NL', website:'https://distribuidoradelnorte.com' },
  });

  // ── Supplier Applications ──
  for (const [sup, data] of [[supplier1,{cn:'Empaques Industriales SA',cat:'empaques',co:'México',st:'CDMX',ci:'Ciudad de México'}],[supplier2,{cn:'MetalTech Industries',cat:'manufactura',co:'México',st:'Nuevo León',ci:'Monterrey'}],[supplier3,{cn:'Alimentos Premium MX',cat:'alimentos',co:'México',st:'Jalisco',ci:'Guadalajara'}]]) {
    await prisma.supplierApplication.upsert({
      where: { approvedUserId: sup.id }, update: {},
      create: { companyName:data.cn, rfc:'XXX010101AAA', category:data.cat, contactName:sup.name, contactEmail:sup.email, contactPhone:sup.phone||'', country:data.co, state:data.st, city:data.ci, monthlyCapacity:10000, capacityUnit:'piezas', leadTimeDays:15, status:'APPROVED', approvedUserId:sup.id },
    });
  }

  // ── 2. Crear 20 productos con imágenes ──
  const supplierMap = {
    empaques: supplier1.id, manufactura: supplier2.id, alimentos: supplier3.id,
    textiles: supplier2.id, quimicos: supplier1.id, electronica: supplier2.id,
    logistica: supplier1.id, construccion: supplier1.id, otros: supplier3.id,
  };

  const createdProducts = [];
  for (const p of PRODUCTS) {
    const sid = supplierMap[p.cat] || supplier1.id;
    const prod = await prisma.product.create({
      data: {
        name:p.name, description:p.desc, price:p.price, supplierPrice:p.sp, stock:p.stock,
        category:p.cat, brand:p.brand, moq:p.moq, leadTimeDays:p.lead, unit:p.unit,
        saleType:'WHOLESALE', status:'ACTIVE',
        tierPricing: JSON.stringify([{minQty:p.moq*2,price:+(p.price*0.9).toFixed(2)},{minQty:p.moq*5,price:+(p.price*0.8).toFixed(2)}]),
        specs: JSON.stringify(p.specs), tags: JSON.stringify(p.tags),
        viewCount: Math.floor(Math.random()*500)+50,
        salesCount: Math.floor(Math.random()*200),
        avgRating: +(3.5+Math.random()*1.5).toFixed(1),
        ratingCount: Math.floor(Math.random()*30)+5,
        supplierId: sid,
        images: { create: [{ url: IMG(p.img), altText:p.name, isPrimary:true, sortOrder:0 }] },
      },
    });
    createdProducts.push(prod);
    console.log(`  ✅ ${prod.id} — ${p.name}`);
  }

  // ── 3. Pedidos ──
  const now = new Date();
  const daysAgo = (d) => new Date(now - d * 86400000);
  const daysAhead = (d) => new Date(now.getTime() + d * 86400000);

  const ord1 = await prisma.order.create({
    data: {
      orderNumber:'ORD-2026-031', clientId:client.id, supplierId:supplier1.id, status:'QUALITY_CONTROL',
      totalAmount:28500, clientAmount:28500, supplierAmount:18000, deliveryDate:daysAhead(20),
      phases:{ create:[
        {phase:'INITIAL_PAYMENT',phaseNumber:1,status:'DONE',completedAt:daysAgo(30)},
        {phase:'PRODUCTION',phaseNumber:2,status:'DONE',completedAt:daysAgo(10)},
        {phase:'QUALITY_CONTROL',phaseNumber:3,status:'IN_PROGRESS'},
        {phase:'SHIPPING',phaseNumber:4,status:'PENDING'},
        {phase:'DELIVERED',phaseNumber:5,status:'PENDING'},
      ]},
      documents:{ create:[
        {type:'PROFORMA',label:'Factura Proforma',fileUrl:'#'},{type:'PACKING_LIST',label:'Packing List',fileUrl:'#'},
        {type:'QUALITY_CERT',label:'Certificado de Calidad',fileUrl:'#'},
      ]},
      payments:{ create:[
        {invoiceNumber:'FAC-2026-031-A',type:'DEPOSIT',percentage:50,amount:14250,status:'PAID',paidAt:daysAgo(28)},
        {invoiceNumber:'FAC-2026-031-B',type:'BALANCE',percentage:50,amount:14250,status:'PENDING',dueDate:daysAhead(4)},
      ]},
      orderItems:{ create:[{productId:createdProducts[0].id,quantity:2000,unitPrice:8.50,supplierUnitPrice:5.20},{productId:createdProducts[2].id,quantity:5000,unitPrice:1.80,supplierUnitPrice:1.10}]},
    },
  });

  const ord2 = await prisma.order.create({
    data: {
      orderNumber:'ORD-2026-019', clientId:client.id, supplierId:supplier1.id, status:'IN_TRANSIT',
      totalAmount:25500, clientAmount:25500, supplierAmount:16000, deliveryDate:daysAhead(7),
      phases:{ create:[
        {phase:'INITIAL_PAYMENT',phaseNumber:1,status:'DONE',completedAt:daysAgo(50)},
        {phase:'PRODUCTION',phaseNumber:2,status:'DONE',completedAt:daysAgo(25)},
        {phase:'QUALITY_CONTROL',phaseNumber:3,status:'DONE',completedAt:daysAgo(10)},
        {phase:'SHIPPING',phaseNumber:4,status:'IN_PROGRESS'},
        {phase:'DELIVERED',phaseNumber:5,status:'PENDING'},
      ]},
      documents:{ create:[
        {type:'PROFORMA',label:'Factura Proforma',fileUrl:'#'},{type:'BILL_OF_LADING',label:'Bill of Lading',fileUrl:'#'},
      ]},
      payments:{ create:[
        {invoiceNumber:'FAC-2026-019-A',type:'DEPOSIT',percentage:50,amount:12750,status:'PAID',paidAt:daysAgo(48)},
        {invoiceNumber:'FAC-2026-019-B',type:'BALANCE',percentage:50,amount:12750,status:'OVERDUE',dueDate:daysAgo(5)},
      ]},
      orderItems:{ create:[{productId:createdProducts[3].id,quantity:100,unitPrice:185,supplierUnitPrice:120}]},
    },
  });

  await prisma.order.create({
    data: {
      orderNumber:'ORD-2026-008', clientId:client.id, supplierId:supplier2.id, status:'DELIVERED',
      totalAmount:12800, clientAmount:12800, supplierAmount:8000, deliveryDate:daysAgo(15),
      phases:{ create:[
        {phase:'INITIAL_PAYMENT',phaseNumber:1,status:'DONE',completedAt:daysAgo(80)},
        {phase:'PRODUCTION',phaseNumber:2,status:'DONE',completedAt:daysAgo(50)},
        {phase:'QUALITY_CONTROL',phaseNumber:3,status:'DONE',completedAt:daysAgo(30)},
        {phase:'SHIPPING',phaseNumber:4,status:'DONE',completedAt:daysAgo(20)},
        {phase:'DELIVERED',phaseNumber:5,status:'DONE',completedAt:daysAgo(15)},
      ]},
      payments:{ create:[{invoiceNumber:'FAC-2026-008',type:'FULL',percentage:100,amount:12800,status:'PAID',paidAt:daysAgo(75)}]},
      orderItems:{ create:[{productId:createdProducts[5].id,quantity:100,unitPrice:125,supplierUnitPrice:78}]},
    },
  });

  await prisma.order.create({
    data: {
      orderNumber:'ORD-2026-035', clientId:client.id, supplierId:supplier3.id, status:'IN_PRODUCTION',
      totalAmount:31000, clientAmount:31000, supplierAmount:20000, sampleStatus:'PENDING', deliveryDate:daysAhead(35),
      phases:{ create:[
        {phase:'INITIAL_PAYMENT',phaseNumber:1,status:'DONE',completedAt:daysAgo(15)},
        {phase:'PRODUCTION',phaseNumber:2,status:'IN_PROGRESS'},
        {phase:'QUALITY_CONTROL',phaseNumber:3,status:'PENDING'},
        {phase:'SHIPPING',phaseNumber:4,status:'PENDING'},
        {phase:'DELIVERED',phaseNumber:5,status:'PENDING'},
      ]},
      payments:{ create:[
        {invoiceNumber:'FAC-2026-035-A',type:'DEPOSIT',percentage:40,amount:12400,status:'PAID',paidAt:daysAgo(13)},
        {invoiceNumber:'FAC-2026-035-B',type:'BALANCE',percentage:60,amount:18600,status:'PENDING',dueDate:daysAhead(22)},
      ]},
      orderItems:{ create:[{productId:createdProducts[7].id,quantity:100,unitPrice:220,supplierUnitPrice:145}]},
    },
  });

  // ── 4. RFQs / Cotizaciones ──
  await prisma.rFQ.create({
    data: {
      rfqNumber:'RFQ-2026-041', clientId:client.id, title:'Cajas de cartón corrugado',
      description:'Cajas 30x20x15 cm, doble capa, impresas a 2 colores con logo',
      quantity:5000, unit:'piezas', category:'empaques', status:'QUOTED',
      images: JSON.stringify([IMG('cardboard_boxes.png')]),
      quotes:{ create:[
        {label:'Opción A',supplierName:'Empaques Industriales SA',supplierCountry:'México',supplierId:supplier1.id,unitPrice:8.50,totalPrice:42500,deliveryDays:18,moq:1000,notes:'Entrega incluida. Material 100% reciclable.',validUntil:daysAhead(10)},
        {label:'Opción B',supplierName:'PackPro Guangzhou',supplierCountry:'China',unitPrice:5.90,totalPrice:29500,deliveryDays:35,moq:3000,notes:'Flete marítimo a cargo del cliente.',validUntil:daysAhead(10)},
      ]},
    },
  });

  await prisma.rFQ.create({
    data: {
      rfqNumber:'RFQ-2026-038', clientId:client.id, title:'Etiquetas adhesivas personalizadas',
      quantity:20000, unit:'piezas', category:'empaques', status:'SEARCHING',
      images: JSON.stringify([IMG('adhesive_labels.png')]),
    },
  });

  await prisma.rFQ.create({
    data: {
      rfqNumber:'RFQ-2026-029', clientId:client.id, title:'Bolsas de polietileno con zipper',
      quantity:10000, unit:'piezas', category:'empaques', status:'APPROVED', orderId:ord1.id,
      images: JSON.stringify([IMG('ziplock_bags.png')]),
    },
  });

  await prisma.rFQ.create({
    data: {
      rfqNumber:'RFQ-2026-021', clientId:client.id, title:'Stretch film industrial',
      quantity:200, unit:'rollos', category:'empaques', status:'EXPIRED',
      images: JSON.stringify([IMG('stretch_film.png')]),
    },
  });

  await prisma.rFQ.create({
    data: {
      rfqNumber:'RFQ-2026-045', clientId:client.id, title:'Empaque biodegradable kraft',
      quantity:8000, unit:'piezas', category:'empaques', status:'QUOTED',
      images: JSON.stringify([IMG('kraft_bags.png')]),
      quotes:{ create:[
        {label:'Opción A',supplierName:'EcoPackMX',supplierCountry:'México',supplierId:supplier1.id,unitPrice:4.20,totalPrice:33600,deliveryDays:22,moq:2000,notes:'Certificación FSC. Entrega incluida CDMX.',validUntil:daysAhead(5)},
      ]},
    },
  });

  await prisma.rFQ.create({
    data: {
      rfqNumber:'RFQ-2026-050', clientId:client.id, title:'Componentes CNC acero inoxidable',
      quantity:500, unit:'piezas', category:'manufactura', status:'QUOTED',
      images: JSON.stringify([IMG('steel_parts.png')]),
      quotes:{ create:[
        {label:'Opción A',supplierName:'MetalTech Industries',supplierCountry:'México',supplierId:supplier2.id,unitPrice:125,totalPrice:62500,deliveryDays:30,moq:50,notes:'Tolerancia ±0.01mm garantizada.',validUntil:daysAhead(15)},
      ]},
    },
  });

  // ── 5. Mensajes ──
  await prisma.message.createMany({
    data: [
      {clientId:client.id,senderId:admin.id,content:'¡Hola María! Hemos recibido tu solicitud RFQ-2026-041. Ya estamos buscando proveedores.',isRead:true,createdAt:daysAgo(5)},
      {clientId:client.id,senderId:client.id,content:'Perfecto, gracias. ¿En cuánto tiempo tienen respuesta?',isRead:true,createdAt:daysAgo(5)},
      {clientId:client.id,senderId:admin.id,content:'Normalmente entre 3-5 días hábiles. Ya tenemos dos opciones listas.',isRead:true,createdAt:daysAgo(3)},
      {clientId:client.id,senderId:admin.id,content:'Ya puedes revisar las cotizaciones en la sección Cotizaciones. ¡Cualquier duda estamos aquí!',isRead:false,createdAt:daysAgo(1)},
    ],
  });

  console.log('\n✅ Seed completado con éxito.');
  console.log('');
  console.log('  👤 Cliente:    maria@distribuidoradelnorte.com / cliente123');
  console.log('  🏭 Proveedor1: carlos@empaquesindustriales.com / proveedor123');
  console.log('  🏭 Proveedor2: ana@metaltech.com / proveedor123');
  console.log('  🏭 Proveedor3: roberto@alimentos-mx.com / proveedor123');
  console.log('  🛡️  Admin:     admin@b2bplatform.com / admin123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
