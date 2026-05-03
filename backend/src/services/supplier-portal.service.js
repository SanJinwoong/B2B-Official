/**
 * supplier-portal.service.js
 * Dashboard y datos del portal de proveedor post-aprobación.
 * ANONIMATO: el proveedor NUNCA ve el nombre real del cliente — solo "Cliente X".
 */
const prisma = require('../config/prisma');

// ── Alias de cliente anónimo ──────────────────────────────────────────────────
const anonClient = (index) => `Cliente ${String.fromCharCode(65 + (index % 26))}`; // A, B, C...

// ── Dashboard ─────────────────────────────────────────────────────────────────
const getDashboard = async (supplierId) => {
  const [orders, products] = await Promise.all([
    prisma.order.findMany({
      where: { supplierId },
      include: {
        client: { select: { id: true } },
        payments: { select: { status: true, amount: true } },
        phases: { select: { phase: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where: { supplierId } }),
  ]);

  // KPIs
  const inProduction = orders.filter((o) =>
    ['IN_PRODUCTION', 'QUALITY_CONTROL'].includes(o.status)
  ).length;

  const toCobrar = orders
    .filter((o) => o.status !== 'DELIVERED')
    .reduce((sum, o) => sum + (o.supplierAmount || 0), 0);

  // Recentorders con cliente anónimo
  const clientIds = [...new Set(orders.map((o) => o.client.id))];
  const clientAliasMap = Object.fromEntries(
    clientIds.map((id, i) => [id, anonClient(i)])
  );

  const recentOrders = orders.slice(0, 5).map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    supplierAmount: o.supplierAmount,
    deliveryDate: o.deliveryDate,
    sampleStatus: o.sampleStatus,
    clientAlias: clientAliasMap[o.client.id],
    currentPhase: o.phases?.find((p) => p.status === 'IN_PROGRESS')?.phase || null,
    paidAmount: o.payments
      .filter((p) => p.status === 'PAID')
      .reduce((s, p) => s + p.amount, 0),
  }));

  // Datos de gráfica mensual (últimos 6 meses)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const monthlyOrders = await prisma.$queryRaw`
    SELECT
      TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') as month,
      COUNT(*)::int as total
    FROM "Order"
    WHERE "supplierId" = ${supplierId}
      AND "createdAt" >= ${sixMonthsAgo}
    GROUP BY DATE_TRUNC('month', "createdAt")
    ORDER BY DATE_TRUNC('month', "createdAt")
  `;

  return {
    stats: {
      newRFQs: 0,          // Se llenará cuando implementemos RFQ → supplier assignment
      inProduction,
      toCobrar,
      avgRating: 0,
      totalRatings: 0,
      productCount: products,
    },
    recentOrders,
    monthlyChart: monthlyOrders.map((m) => ({ month: m.month, total: Number(m.total), onTime: Math.floor(Number(m.total) * 0.91) })),
    metrics: {
      responseRate: 94,
      onTimeDelivery: 91,
      qualityRating: 0,
      deliveryRating: 0,
      communicationRating: 0,
    },
  };
};

// ── Mis Pedidos ───────────────────────────────────────────────────────────────
const getMyOrders = async (supplierId, { status } = {}) => {
  const where = { supplierId };
  if (status && status !== 'ALL') where.status = status;

  const orders = await prisma.order.findMany({
    where,
    include: {
      client: { select: { id: true } },
      phases: true,
      payments: { select: { status: true, amount: true, type: true } },
      orderItems: { include: { product: { include: { images: true } } } },
      rfq: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const clientIds = [...new Set(orders.map((o) => o.client.id))];
  const clientAliasMap = Object.fromEntries(
    clientIds.map((id, i) => [id, anonClient(i)])
  );

  return orders.map((o) => {
    let itemsMapped = o.orderItems.map(i => ({
      productName: i.product.name,
      quantity: i.quantity,
      image: i.product.images?.find(img => img.isPrimary)?.url || i.product.images?.[0]?.url || null
    }));

    if (itemsMapped.length === 0 && o.rfq) {
      let rfqImages = [];
      try { rfqImages = JSON.parse(o.rfq.images); } catch(e){}
      itemsMapped = [{
        productName: o.rfq.title,
        quantity: o.rfq.quantity,
        image: Array.isArray(rfqImages) && rfqImages.length > 0 ? rfqImages[0] : null
      }];
    }

    return {
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      supplierAmount: o.supplierAmount,
      deliveryDate: o.deliveryDate,
      sampleStatus: o.sampleStatus,
      clientAlias: clientAliasMap[o.client.id],
      phases: o.phases,
      paidAmount: o.payments
        .filter((p) => p.status === 'PAID')
        .reduce((s, p) => s + p.amount, 0),
      isOverdue: o.deliveryDate ? new Date(o.deliveryDate) < new Date() && o.status !== 'DELIVERED' : false,
      createdAt: o.createdAt,
      items: itemsMapped,
    };
  });
};

// ── Actualizar estado de pedido (transiciones permitidas para proveedor) ───────
const ALLOWED_TRANSITIONS = {
  PENDING:         'IN_PRODUCTION',
  IN_PRODUCTION:   'QUALITY_CONTROL',
  QUALITY_CONTROL: 'IN_TRANSIT',
  IN_TRANSIT:      null, // el admin marca como DELIVERED
};

const updateOrderStatus = async (supplierId, orderId, { status, notes }) => {
  const order = await prisma.order.findFirst({
    where: { id: Number(orderId), supplierId },
  });
  if (!order) throw Object.assign(new Error('Pedido no encontrado.'), { statusCode: 404 });

  const allowed = ALLOWED_TRANSITIONS[order.status];
  if (!allowed || allowed !== status) {
    throw Object.assign(
      new Error(`Transición no permitida: ${order.status} → ${status}`),
      { statusCode: 400 }
    );
  }

  // Actualizar estado del pedido y la fase correspondiente
  const [updated] = await prisma.$transaction([
    prisma.order.update({
      where: { id: Number(orderId) },
      data:  { status },
    }),
    prisma.orderPhase.updateMany({
      where: { orderId: Number(orderId), status: 'IN_PROGRESS' },
      data:  { status: 'DONE', completedAt: new Date(), notes },
    }),
  ]);

  // Activar la siguiente fase
  const PHASE_MAP = {
    IN_PRODUCTION:   'PRODUCTION',
    QUALITY_CONTROL: 'QUALITY_CONTROL',
    IN_TRANSIT:      'SHIPPING',
  };
  if (PHASE_MAP[status]) {
    await prisma.orderPhase.updateMany({
      where: { orderId: Number(orderId), phase: PHASE_MAP[status], status: 'PENDING' },
      data:  { status: 'IN_PROGRESS' },
    });
  }

  // Notify client if order is in transit
  if (status === 'IN_TRANSIT') {
    const { notifyUser } = require('./notification.service');
    await notifyUser(
      order.clientId,
      'ORDER_SHIPPED',
      'Tu pedido ha sido enviado',
      `El proveedor ha enviado tu pedido ${order.orderNumber}. Por favor confírmalo cuando lo recibas.`,
      `/client/orders/${order.id}`
    );
  }

  return updated;
};

// ── Mi Catálogo ───────────────────────────────────────────────────────────────
const getCatalog = async (supplierId, { search, status } = {}) => {
  const where = { supplierId };
  if (search) where.name = { contains: search, mode: 'insensitive' };
  if (status && status !== 'ALL') where.status = status;

  const products = await prisma.product.findMany({
    where,
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      _count:  { select: { ratings: true, orderItems: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const parseJSON = (str, fallback) => { try { return JSON.parse(str); } catch { return fallback; } };

  return products.map((p) => ({
    ...p,
    tierPricing: parseJSON(p.tierPricing, []),
    specs:       parseJSON(p.specs, {}),
    tags:        parseJSON(p.tags, []),
    reviewCount: p._count.ratings,
    salesCount:  p._count.orderItems,
  }));
};

const createProduct = async (supplierId, data) => {
  const {
    name, description, price, supplierPrice, stock,
    category = 'general', subcategory, brand, sku,
    saleType = 'WHOLESALE', moq = 1, leadTimeDays = 7, unit = 'piezas',
    tierPricing = [], specs = {}, tags = [],
    status = 'ACTIVE',
    images = [],
  } = data;

  return prisma.product.create({
    data: {
      name, description: description || null,
      price:         parseFloat(price),
      supplierPrice: parseFloat(supplierPrice || 0),
      stock:         parseInt(stock || 0),
      category, subcategory: subcategory || null,
      brand: brand || null, sku: sku || null,
      saleType, moq: parseInt(moq), leadTimeDays: parseInt(leadTimeDays), unit,
      tierPricing: JSON.stringify(tierPricing),
      specs:       JSON.stringify(specs),
      tags:        JSON.stringify(tags),
      status,
      supplierId,
      images: images.length > 0 ? {
        create: images.map((img, i) => ({
          url:       img.url,
          altText:   img.altText || null,
          isPrimary: i === 0,
          sortOrder: i,
        })),
      } : undefined,
    },
    include: { images: true },
  });
};

const updateProduct = async (supplierId, productId, data) => {
  const product = await prisma.product.findFirst({
    where: { id: Number(productId), supplierId },
  });
  if (!product) throw Object.assign(new Error('Producto no encontrado.'), { statusCode: 404 });

  const parseJSON = (str, fallback) => { try { return JSON.parse(str); } catch { return fallback; } };

  const updateData = {};
  if (data.name        != null) updateData.name        = data.name;
  if (data.description != null) updateData.description = data.description;
  if (data.price       != null) updateData.price        = parseFloat(data.price);
  if (data.supplierPrice != null) updateData.supplierPrice = parseFloat(data.supplierPrice);
  if (data.stock       != null) updateData.stock        = parseInt(data.stock);
  if (data.category    != null) updateData.category     = data.category;
  if (data.subcategory != null) updateData.subcategory  = data.subcategory;
  if (data.brand       != null) updateData.brand        = data.brand;
  if (data.sku         != null) updateData.sku          = data.sku;
  if (data.saleType    != null) updateData.saleType     = data.saleType;
  if (data.moq         != null) updateData.moq          = parseInt(data.moq);
  if (data.leadTimeDays!= null) updateData.leadTimeDays = parseInt(data.leadTimeDays);
  if (data.unit        != null) updateData.unit         = data.unit;
  if (data.status      != null) updateData.status       = data.status;
  if (data.tierPricing != null) updateData.tierPricing  = JSON.stringify(data.tierPricing);
  if (data.specs       != null) updateData.specs        = JSON.stringify(data.specs);
  if (data.tags        != null) updateData.tags         = JSON.stringify(data.tags);

  // Si mandan imágenes nuevas, reemplazar todas
  if (data.images && Array.isArray(data.images)) {
    await prisma.productImage.deleteMany({ where: { productId: Number(productId) } });
    updateData.images = {
      create: data.images.map((img, i) => ({
        url:       img.url,
        altText:   img.altText || null,
        isPrimary: i === 0,
        sortOrder: i,
      })),
    };
  }

  return prisma.product.update({
    where:   { id: Number(productId) },
    data:    updateData,
    include: { images: true },
  });
};

const deleteProduct = async (supplierId, productId) => {
  const product = await prisma.product.findFirst({
    where: { id: Number(productId), supplierId },
  });
  if (!product) throw Object.assign(new Error('Producto no encontrado.'), { statusCode: 404 });

  return prisma.product.delete({ where: { id: Number(productId) } });
};

// ── Oportunidades (RFQs) ──────────────────────────────────────────────────────
const getOpportunities = async (supplierId) => {
  const supplierApp = await prisma.supplierApplication.findUnique({
    where: { approvedUserId: supplierId }
  });
  if (!supplierApp) return [];

  const allRfqs = await prisma.rFQ.findMany({
    where: {
      status: { in: ['PENDING', 'SEARCHING', 'QUOTED'] },
      quotes: { none: { supplierId } }
    },
    include: { client: { select: { id: true } } },
    orderBy: { createdAt: 'desc' }
  });

  const normalize = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : '';
  const supplierCats = supplierApp.category ? supplierApp.category.split(',').map(normalize) : [];

  const rfqs = allRfqs.filter(rfq => {
    if (!rfq.category) return false;
    const rfqCat = normalize(rfq.category);
    if (rfqCat === 'general' || rfqCat === 'otros') return true;
    return supplierCats.some(c => c.includes(rfqCat) || rfqCat.includes(c));
  });

  const clientIds = [...new Set(rfqs.map((o) => o.client.id))];
  const clientAliasMap = Object.fromEntries(clientIds.map((id, i) => [id, anonClient(i)]));

  const parseJSON = (str, fallback) => { try { return JSON.parse(str); } catch { return fallback; } };

  return rfqs.map(rfq => ({
    ...rfq,
    images: parseJSON(rfq.images, []),
    clientAlias: clientAliasMap[rfq.client.id]
  }));
};

const submitQuote = async (supplierId, rfqId, quoteData) => {
  const rfq = await prisma.rFQ.findUnique({ where: { id: Number(rfqId) } });
  if (!rfq || !['PENDING', 'SEARCHING', 'QUOTED'].includes(rfq.status)) {
    throw Object.assign(new Error('RFQ no disponible para cotizar.'), { statusCode: 400 });
  }

  const existingQuote = await prisma.rFQQuote.findFirst({
    where: { rfqId: Number(rfqId), supplierId }
  });
  if (existingQuote) {
    throw Object.assign(new Error('Ya enviaste una cotización para esta solicitud.'), { statusCode: 400 });
  }

  const supplierApp = await prisma.supplierApplication.findUnique({
    where: { approvedUserId: supplierId }
  });

  const [quote] = await prisma.$transaction([
    prisma.rFQQuote.create({
      data: {
        rfqId: Number(rfqId),
        supplierId,
        supplierName: supplierApp?.companyName || 'Proveedor',
        supplierCountry: supplierApp?.country || 'MX',
        label: `Opción de ${supplierApp?.companyName || 'Proveedor'}`,
        unitPrice: parseFloat(quoteData.unitPrice),
        totalPrice: parseFloat(quoteData.totalPrice),
        deliveryDays: parseInt(quoteData.deliveryDays),
        moq: parseInt(quoteData.moq),
        notes: quoteData.notes || null,
        validUntil: quoteData.validUntil ? new Date(quoteData.validUntil) : null
      }
    }),
    prisma.rFQ.update({
      where: { id: Number(rfqId) },
      data: { status: 'QUOTED' }
    })
  ]);

  const { notifyUser } = require('./notification.service');
  await notifyUser(
    rfq.clientId,
    'RFQ_QUOTED',
    'Nueva propuesta recibida',
    `Un proveedor ha enviado una propuesta para tu solicitud ${rfq.rfqNumber}.`,
    '/client/rfqs'
  );

  return quote;
};

module.exports = { getDashboard, getMyOrders, updateOrderStatus, getCatalog, createProduct, updateProduct, deleteProduct, getOpportunities, submitQuote };

