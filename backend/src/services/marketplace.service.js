/**
 * marketplace.service.js
 * Lógica del marketplace B2B: búsqueda, detalle, carrito, wishlist y checkout.
 * El cliente ve el nombre de la empresa del proveedor (estándar B2B).
 */
const prisma = require('../config/prisma');

// ── Categorías disponibles ────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'empaques',      label: 'Empaques y Envases' },
  { id: 'manufactura',   label: 'Manufactura Industrial' },
  { id: 'alimentos',     label: 'Alimentos y Bebidas' },
  { id: 'textiles',      label: 'Textiles y Confección' },
  { id: 'logistica',     label: 'Logística y Transporte' },
  { id: 'quimicos',      label: 'Químicos e Insumos' },
  { id: 'electronica',   label: 'Electrónica y Componentes' },
  { id: 'construccion',  label: 'Construcción y Materiales' },
  { id: 'otros',         label: 'Otros' },
];

// ── Selects reutilizables ─────────────────────────────────────────────────────
const productBaseSelect = {
  id: true, name: true, description: true, price: true,
  stock: true, category: true, subcategory: true, brand: true, sku: true,
  saleType: true, moq: true, leadTimeDays: true, unit: true,
  tierPricing: true, status: true, specs: true, tags: true,
  viewCount: true, salesCount: true, avgRating: true, ratingCount: true,
  createdAt: true, updatedAt: true,
  supplierId: true,
  supplier: {
    select: {
      id: true, name: true, email: true,
      approvedApplication: {
        select: { companyName: true, category: true, country: true, state: true }
      }
    }
  },
  images: {
    select: { id: true, url: true, altText: true, isPrimary: true, sortOrder: true },
    orderBy: { sortOrder: 'asc' },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const parseJSON = (str, fallback) => {
  try { return JSON.parse(str); } catch { return fallback; }
};

const buildProductResponse = (p) => ({
  ...p,
  tierPricing: parseJSON(p.tierPricing, []),
  specs:       parseJSON(p.specs, {}),
  tags:        parseJSON(p.tags, []),
  supplierName: p.supplier?.approvedApplication?.companyName || p.supplier?.name || 'Proveedor',
  supplierLocation: [
    p.supplier?.approvedApplication?.city,
    p.supplier?.approvedApplication?.state,
  ].filter(Boolean).join(', ') || '',
});

// ═══════════════════════════════════════════════════════════════════════════════
//  MARKETPLACE — Búsqueda y catálogo público
// ═══════════════════════════════════════════════════════════════════════════════

const getCategories = () => CATEGORIES;

/**
 * Búsqueda con filtros, ordenamiento y paginación.
 * Los clientes solo ven productos ACTIVE con stock > 0 (o WHOLESALE sin stock relevante).
 */
const searchProducts = async ({
  search, category, saleType, minPrice, maxPrice,
  supplierId, sortBy = 'newest', page = 1, limit = 20,
} = {}) => {
  const where = {
    status: 'ACTIVE',
  };

  if (search) {
    where.OR = [
      { name:        { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { brand:       { contains: search, mode: 'insensitive' } },
      { tags:        { contains: search, mode: 'insensitive' } },
    ];
  }

  if (category && category !== 'all')  where.category  = category;
  if (saleType && saleType !== 'all')  where.saleType  = saleType;
  if (supplierId)                       where.supplierId = Number(supplierId);
  if (minPrice != null)                 where.price      = { ...where.price, gte: Number(minPrice) };
  if (maxPrice != null)                 where.price      = { ...where.price, lte: Number(maxPrice) };

  const sortMap = {
    newest:    { createdAt: 'desc' },
    price_asc: { price: 'asc' },
    price_desc:{ price: 'desc' },
    rating:    { avgRating: 'desc' },
    bestseller:{ salesCount: 'desc' },
  };

  const orderBy = sortMap[sortBy] || { createdAt: 'desc' };
  const skip    = (Number(page) - 1) * Number(limit);

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where, orderBy,
      skip, take: Number(limit),
      select: productBaseSelect,
    }),
  ]);

  return {
    products: products.map(buildProductResponse),
    pagination: {
      total, page: Number(page), limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    },
  };
};

/**
 * Detalle de producto (incrementa viewCount).
 */
const getProductDetail = async (productId, clientId = null) => {
  const product = await prisma.product.findUnique({
    where: { id: Number(productId), status: 'ACTIVE' },
    select: {
      ...productBaseSelect,
      ratings: {
        select: {
          id: true, stars: true, comment: true, verified: true,
          clientId: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!product) {
    const err = new Error('Producto no encontrado.');
    err.statusCode = 404; throw err;
  }

  // Incrementar viewCount sin bloquear
  prisma.product.update({
    where: { id: Number(productId) },
    data:  { viewCount: { increment: 1 } },
  }).catch(() => {});

  // ¿Está en wishlist del cliente?
  let inWishlist = false;
  let inCart = false;
  if (clientId) {
    const [wl, cart] = await Promise.all([
      prisma.wishlistItem.findUnique({ where: { clientId_productId: { clientId: Number(clientId), productId: Number(productId) } } }),
      prisma.cartItem.findUnique({ where: { clientId_productId: { clientId: Number(clientId), productId: Number(productId) } } }),
    ]);
    inWishlist = !!wl;
    inCart     = !!cart;
  }

  // Productos relacionados (misma categoría, hasta 6)
  const related = await prisma.product.findMany({
    where: { status: 'ACTIVE', category: product.category, id: { not: Number(productId) } },
    select: productBaseSelect,
    take: 6,
    orderBy: { avgRating: 'desc' },
  });

  return {
    ...buildProductResponse(product),
    inWishlist,
    inCart,
    related: related.map(buildProductResponse),
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
//  RATINGS
// ═══════════════════════════════════════════════════════════════════════════════

const submitRating = async (clientId, productId, { stars, comment }) => {
  if (stars < 1 || stars > 5) {
    const err = new Error('La calificación debe estar entre 1 y 5.');
    err.statusCode = 400; throw err;
  }

  // Verificar si el cliente tiene alguna orden entregada con este producto
  const hasDeliveredOrder = await prisma.orderItem.findFirst({
    where: {
      productId: Number(productId),
      order: { clientId: Number(clientId), status: 'DELIVERED' },
    },
  });

  const rating = await prisma.productRating.upsert({
    where: { productId_clientId: { productId: Number(productId), clientId: Number(clientId) } },
    create: {
      productId: Number(productId),
      clientId:  Number(clientId),
      stars: Number(stars),
      comment: comment || null,
      verified: !!hasDeliveredOrder,
    },
    update: {
      stars: Number(stars),
      comment: comment || null,
    },
  });

  // Recalcular avgRating
  const agg = await prisma.productRating.aggregate({
    where:  { productId: Number(productId) },
    _avg:   { stars: true },
    _count: { stars: true },
  });

  await prisma.product.update({
    where: { id: Number(productId) },
    data: {
      avgRating:   agg._avg.stars || 0,
      ratingCount: agg._count.stars,
    },
  });

  return rating;
};

// ═══════════════════════════════════════════════════════════════════════════════
//  CARRITO
// ═══════════════════════════════════════════════════════════════════════════════

const getCart = async (clientId) => {
  const items = await prisma.cartItem.findMany({
    where: { clientId: Number(clientId) },
    include: {
      product: {
        select: {
          ...productBaseSelect,
          supplier: {
            select: {
              id: true, name: true,
              approvedApplication: { select: { companyName: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const cartItems = items.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    priceSnapshot: item.priceSnapshot,
    product: buildProductResponse(item.product),
    subtotal: item.quantity * item.priceSnapshot,
  }));

  const total = cartItems.reduce((s, i) => s + i.subtotal, 0);

  return { items: cartItems, total, itemCount: cartItems.length };
};

const addToCart = async (clientId, productId, quantity = 1) => {
  const product = await prisma.product.findUnique({
    where: { id: Number(productId), status: 'ACTIVE' },
  });
  if (!product) {
    const err = new Error('Producto no disponible.'); err.statusCode = 404; throw err;
  }

  // Validar MOQ
  if (Number(quantity) < product.moq) {
    const err = new Error(`La cantidad mínima de pedido es ${product.moq} ${product.unit}.`);
    err.statusCode = 400; throw err;
  }

  return prisma.cartItem.upsert({
    where: { clientId_productId: { clientId: Number(clientId), productId: Number(productId) } },
    create: {
      clientId: Number(clientId),
      productId: Number(productId),
      quantity: Number(quantity),
      priceSnapshot: product.price,
    },
    update: { quantity: Number(quantity), priceSnapshot: product.price },
  });
};

const updateCartItem = async (clientId, cartItemId, quantity) => {
  const item = await prisma.cartItem.findFirst({
    where: { id: Number(cartItemId), clientId: Number(clientId) },
    include: { product: true },
  });
  if (!item) { const err = new Error('Ítem no encontrado.'); err.statusCode = 404; throw err; }

  if (Number(quantity) < item.product.moq) {
    const err = new Error(`La cantidad mínima es ${item.product.moq} ${item.product.unit}.`);
    err.statusCode = 400; throw err;
  }

  return prisma.cartItem.update({
    where: { id: Number(cartItemId) },
    data:  { quantity: Number(quantity) },
  });
};

const removeFromCart = async (clientId, cartItemId) => {
  const item = await prisma.cartItem.findFirst({
    where: { id: Number(cartItemId), clientId: Number(clientId) },
  });
  if (!item) { const err = new Error('Ítem no encontrado.'); err.statusCode = 404; throw err; }
  return prisma.cartItem.delete({ where: { id: Number(cartItemId) } });
};

const clearCart = async (clientId) => {
  return prisma.cartItem.deleteMany({ where: { clientId: Number(clientId) } });
};

/**
 * Checkout: convierte el carrito en una o más órdenes (una por proveedor).
 * El proveedor ve el nombre de empresa del cliente (estándar B2B).
 */
const checkout = async (clientId, { notes, deliveryDate } = {}) => {
  const cartItems = await prisma.cartItem.findMany({
    where: { clientId: Number(clientId) },
    include: { product: { include: { supplier: true } } },
  });

  if (!cartItems.length) {
    const err = new Error('El carrito está vacío.'); err.statusCode = 400; throw err;
  }

  // Agrupar ítems por proveedor
  const bySupplier = {};
  for (const item of cartItems) {
    const sid = item.product.supplierId;
    if (!bySupplier[sid]) bySupplier[sid] = [];
    bySupplier[sid].push(item);
  }

  const orders = [];

  await prisma.$transaction(async (tx) => {
    for (const [supplierId, items] of Object.entries(bySupplier)) {
      const clientTotal    = items.reduce((s, i) => s + i.quantity * i.priceSnapshot, 0);
      const supplierTotal  = items.reduce((s, i) => s + i.quantity * (i.product.supplierPrice || i.priceSnapshot), 0);

      // Número de orden único
      const count = await tx.order.count();
      const year  = new Date().getFullYear();
      const orderNumber = `ORD-${year}-MP${String(count + 1).padStart(3, '0')}`;

      const order = await tx.order.create({
        data: {
          orderNumber,
          status:        'PENDING',   // El proveedor confirma desde su portal
          clientAmount:  clientTotal,
          supplierAmount: supplierTotal,
          totalAmount:   clientTotal,
          clientId:      Number(clientId),
          supplierId:    Number(supplierId),
          deliveryDate:  deliveryDate ? new Date(deliveryDate) : null,
          orderItems: {
            create: items.map((item) => ({
              productId:         item.productId,
              quantity:          item.quantity,
              unitPrice:         item.priceSnapshot,
              supplierUnitPrice: item.product.supplierPrice || item.priceSnapshot,
            })),
          },
          phases: {
            create: [
              { phase: 'INITIAL_PAYMENT', phaseNumber: 1, status: 'PENDING' },
              { phase: 'PRODUCTION',      phaseNumber: 2, status: 'PENDING' },
              { phase: 'QUALITY_CONTROL', phaseNumber: 3, status: 'PENDING' },
              { phase: 'SHIPPING',        phaseNumber: 4, status: 'PENDING' },
              { phase: 'DELIVERED',       phaseNumber: 5, status: 'PENDING' },
            ],
          },
        },
        include: { orderItems: true },
      });

      // Incrementar salesCount de los productos
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data:  { salesCount: { increment: item.quantity } },
        });
      }

      orders.push(order);
    }

    // Vaciar carrito
    await tx.cartItem.deleteMany({ where: { clientId: Number(clientId) } });
  });

  return { orders, orderCount: orders.length };
};

// ═══════════════════════════════════════════════════════════════════════════════
//  WISHLIST
// ═══════════════════════════════════════════════════════════════════════════════

const getWishlist = async (clientId) => {
  const items = await prisma.wishlistItem.findMany({
    where: { clientId: Number(clientId) },
    include: { product: { select: productBaseSelect } },
    orderBy: { createdAt: 'desc' },
  });

  return items.map((i) => ({ id: i.id, product: buildProductResponse(i.product), savedAt: i.createdAt }));
};

const toggleWishlist = async (clientId, productId) => {
  const existing = await prisma.wishlistItem.findUnique({
    where: { clientId_productId: { clientId: Number(clientId), productId: Number(productId) } },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    return { inWishlist: false };
  }

  // Verificar que el producto exista y esté activo
  const product = await prisma.product.findUnique({ where: { id: Number(productId), status: 'ACTIVE' } });
  if (!product) { const err = new Error('Producto no encontrado.'); err.statusCode = 404; throw err; }

  await prisma.wishlistItem.create({ data: { clientId: Number(clientId), productId: Number(productId) } });
  return { inWishlist: true };
};

module.exports = {
  getCategories,
  searchProducts,
  getProductDetail,
  submitRating,
  getCart, addToCart, updateCartItem, removeFromCart, clearCart, checkout,
  getWishlist, toggleWishlist,
};
