const prisma = require('../config/prisma');

/**
 * Crea una orden con múltiples productos dentro de una transacción atómica.
 *
 * Estrategia anti-sobreventa:
 * En vez de leer el stock y luego decrementarlo (race condition), usamos
 * `updateMany` con una condición `stock >= quantity`.
 * Si `count === 0` significa que otro cliente llegó primero → rollback.
 *
 * @param {number}   clientId - ID del cliente autenticado (del JWT)
 * @param {Array}    items    - [{ productId: number, quantity: number }]
 * @returns {Object} La orden creada con sus items
 */
const createOrder = async (clientId, items) => {
  return prisma.$transaction(async (tx) => {
    // ── 1. Verificar que todos los productos existen y tienen stock ────────
    const productIds = items.map((i) => i.productId);
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      const foundIds = products.map((p) => p.id);
      const missing = productIds.filter((id) => !foundIds.includes(id));
      const error = new Error(`Productos no encontrados: IDs [${missing.join(', ')}].`);
      error.statusCode = 404;
      throw error;
    }

    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    // Validación previa de stock (rápida, antes de tocar la DB)
    for (const item of items) {
      const product = productMap[item.productId];
      if (product.stock < item.quantity) {
        const error = new Error(
          `Stock insuficiente para "${product.name}". Disponible: ${product.stock}, solicitado: ${item.quantity}.`
        );
        error.statusCode = 409;
        throw error;
      }
    }

    // ── 2. Decrementar stock atómicamente (anti race-condition) ───────────
    for (const item of items) {
      const result = await tx.product.updateMany({
        where: {
          id: item.productId,
          stock: { gte: item.quantity },
        },
        data: {
          stock: { decrement: item.quantity },
        },
      });

      if (result.count === 0) {
        const product = productMap[item.productId];
        const error = new Error(
          `Stock agotado en "${product.name}" por compra concurrente. Por favor intente de nuevo.`
        );
        error.statusCode = 409;
        throw error;
      }
    }

    // ── 3. Calcular totales con margen ────────────────────────────────────
    // unitPrice         = product.price          (precio cliente, con margen)
    // supplierUnitPrice = product.supplierPrice   (costo real del proveedor)
    // Los precios se congelan en el momento de la compra.
    const orderItemsData = items.map((item) => {
      const product = productMap[item.productId];
      return {
        productId:         item.productId,
        quantity:          item.quantity,
        unitPrice:         product.price,
        supplierUnitPrice: product.supplierPrice, // costo congelado en la compra
      };
    });

    const clientAmount   = parseFloat(
      orderItemsData.reduce((sum, i) => sum + i.unitPrice         * i.quantity, 0).toFixed(2)
    );
    const supplierAmount = parseFloat(
      orderItemsData.reduce((sum, i) => sum + i.supplierUnitPrice * i.quantity, 0).toFixed(2)
    );

    // ── 4. Crear la orden y sus items en un solo paso ─────────────────────
    const order = await tx.order.create({
      data: {
        clientId,
        status:        'PENDING',
        totalAmount:    clientAmount,   // backward compat
        clientAmount,
        supplierAmount,
        orderItems: {
          create: orderItemsData,
        },
      },
      include: {
        orderItems: {
          include: {
            product: { select: { id: true, name: true, price: true, supplierPrice: true, supplierId: true } },
          },
        },
      },
    });

    return order;
  });
};

/**
 * Retorna las órdenes de un cliente específico.
 * Un CLIENT solo puede ver las suyas → clientId viene del JWT.
 */
const getMyOrders = async (clientId) => {
  return prisma.order.findMany({
    where: { clientId },
    include: {
      orderItems: {
        include: {
          product: { select: { id: true, name: true, price: true, images: true } },
        },
      },
      phases:    { orderBy: { phaseNumber: 'asc' } },
      documents: { orderBy: { createdAt: 'asc' } },
      payments:  { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Retorna todas las órdenes del sistema.
 * Solo para ADMIN.
 */
const getAllOrders = async () => {
  return prisma.order.findMany({
    include: {
      client: { select: { id: true, name: true, email: true } },
      orderItems: {
        include: {
          product: { select: { id: true, name: true, price: true, supplierPrice: true, supplierId: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Retorna una orden por ID.
 * ⚠️  La validación de acceso (¿es tuya o eres admin?) se hace en el controller.
 */
const getOrderById = async (id) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, email: true } },
      orderItems: {
        include: {
          product: { select: { id: true, name: true, price: true, images: true } },
        },
      },
      phases:    { orderBy: { phaseNumber: 'asc' } },
      documents: { orderBy: { createdAt: 'asc' } },
      payments:  { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!order) {
    const error = new Error('Orden no encontrada.');
    error.statusCode = 404;
    throw error;
  }

  return order;
};

/**
 * Cambia el estado de una orden.
 * Solo ADMIN o SUPPLIER pueden llamar a esta función (verificado en la ruta).
 * Estados válidos: PENDING → APPROVED → SHIPPED → DELIVERED
 */
const updateOrderStatus = async (id, status) => {
  const validStatuses = ['PENDING', 'IN_PRODUCTION', 'QUALITY_CONTROL', 'IN_TRANSIT', 'DELIVERED', 'APPROVED', 'SHIPPED'];
  if (!validStatuses.includes(status)) {
    const error = new Error(
      `Estado inválido. Los estados permitidos son: ${validStatuses.join(', ')}.`
    );
    error.statusCode = 400;
    throw error;
  }

  // Verificar que la orden existe
  const order = await getOrderById(id);

  let updatedOrder;
  if (status === 'DELIVERED') {
    const [updated] = await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data: { status },
      }),
      prisma.orderPhase.updateMany({
        where: { orderId: id },
        data: { status: 'DONE', completedAt: new Date() },
      }),
    ]);
    updatedOrder = updated;
  } else {
    updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
    });
  }

  // Generate system message in the B2B chat
  const statusLabels = {
    'IN_PRODUCTION': 'En Producción',
    'QUALITY_CONTROL': 'Control de Calidad',
    'IN_TRANSIT': 'En Tránsito',
    'DELIVERED': 'Entregado'
  };
  const label = statusLabels[status] || status;
  
  // Try to find the system admin to act as sender, or fallback to clientId if none found
  // For a generic system message we just need a valid senderId. We use the client themselves to avoid crashing, but we add a specific tag.
  await prisma.orderMessage.create({
    data: {
      orderId: id,
      senderId: order.supplierId || order.clientId,
      content: `[SISTEMA] El estado de tu pedido se ha actualizado a: ${label}`,
      hasFlaggedWords: false
    }
  });

  return updatedOrder;
};

const respondSample = async (clientId, orderId, status) => {
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    throw Object.assign(new Error('Status de muestra inválido.'), { statusCode: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: Number(orderId) },
  });

  if (!order || order.clientId !== clientId) {
    throw Object.assign(new Error('Pedido no encontrado.'), { statusCode: 404 });
  }

  if (order.sampleStatus !== 'PENDING') {
    throw Object.assign(new Error('La muestra ya fue procesada.'), { statusCode: 400 });
  }

  return prisma.order.update({
    where: { id: Number(orderId) },
    data: { sampleStatus: status },
    include: {
      client: true,
      supplier: true,
      orderItems: {
        include: { product: true },
      },
      phases: true,
      documents: true,
      payments: true,
      rfq: true,
    },
  });
};

const getOrderMessages = async (orderId, userId, userRole) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });
  
  if (!order) {
    const error = new Error('Orden no encontrada.');
    error.statusCode = 404;
    throw error;
  }
  
  if (userRole === 'CLIENT' && order.clientId !== userId) {
    const error = new Error('No autorizado.');
    error.statusCode = 403;
    throw error;
  }
  
  if (userRole === 'SUPPLIER' && order.supplierId !== userId) {
    const error = new Error('No autorizado.');
    error.statusCode = 403;
    throw error;
  }
  
  return prisma.orderMessage.findMany({
    where: { orderId },
    include: {
      sender: { select: { id: true, name: true, role: true } }
    },
    orderBy: { createdAt: 'asc' }
  });
};

const sendOrderMessage = async (orderId, senderId, senderRole, content) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });
  
  if (!order) {
    const error = new Error('Orden no encontrada.');
    error.statusCode = 404;
    throw error;
  }
  
  // Auditing checks
  const flaggedWordsRegex = /whatsapp|celular|\@gmail|\@yahoo|\@hotmail|telefono|teléfono/i;
  const hasFlaggedWords = flaggedWordsRegex.test(content);
  
  const message = await prisma.orderMessage.create({
    data: {
      orderId,
      senderId,
      content,
      hasFlaggedWords,
      isAdminVisible: true
    },
    include: {
      sender: { select: { id: true, name: true, role: true } }
    }
  });
  
  if (hasFlaggedWords) {
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (adminUser) {
      await prisma.notification.create({
        data: {
          userId: adminUser.id,
          type: 'FLAGGED_MESSAGE',
          title: 'Alerta de Evasión Detectada',
          message: `El usuario ${message.sender.name} ha usado palabras prohibidas en el chat de la orden #${order.orderNumber || orderId}.`,
          link: `/admin/orders/${orderId}`
        }
      });
    }
  }
  
  const receiverId = senderRole === 'CLIENT' ? order.supplierId : order.clientId;
  if (receiverId) {
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: 'NEW_MESSAGE',
        title: 'Nuevo Mensaje',
        message: `Tienes un nuevo mensaje en la orden #${order.orderNumber || orderId}`,
        link: senderRole === 'CLIENT' ? `/supplier/orders/${orderId}` : `/client/orders/${orderId}`
      }
    });
  }
  
  return message;
};

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  respondSample,
  getOrderMessages,
  sendOrderMessage,
};
