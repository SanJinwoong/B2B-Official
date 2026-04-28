const prisma = require('../config/prisma');

/**
 * Retorna todos los productos (público).
 */
const getAllProducts = async () => {
  return prisma.product.findMany({
    include: {
      supplier: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Retorna un producto por su ID (público).
 * Lanza 404 si no existe.
 */
const getProductById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      supplier: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!product) {
    const error = new Error('Producto no encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return product;
};

/**
 * Crea un nuevo producto.
 * El supplierId se toma del usuario autenticado (req.user.id),
 * nunca del cuerpo de la petición.
 */
const createProduct = async ({ name, description, price, supplierPrice, stock }, supplierId) => {
  return prisma.product.create({
    data: {
      name,
      description,
      price,
      supplierPrice: supplierPrice ?? price, // Si no se define, sin margen
      stock,
      supplierId,
    },
  });
};

/**
 * Actualiza un producto.
 * ⚠️  Valida que el producto pertenezca al proveedor que hace la petición.
 */
const updateProduct = async (id, { name, description, price, supplierPrice, stock }, supplierId) => {
  const product = await getProductById(id);

  // ── Validación de ownership ───────────────────────────────────────────────
  if (product.supplierId !== supplierId) {
    const error = new Error('No autorizado: este producto no te pertenece.');
    error.statusCode = 403;
    throw error;
  }

  // ── Validaciones de negocio para márgenes ───────────────────────────────
  if (supplierPrice !== undefined && supplierPrice !== product.supplierPrice) {
    // Verificar si existen órdenes con este producto
    const existingOrders = await prisma.orderItem.findFirst({
      where: { productId: id }
    });

    if (existingOrders) {
      const error = new Error('No se puede modificar el costo del proveedor porque ya existen órdenes para este producto.');
      error.statusCode = 409;
      throw error;
    }
  }

  const effectivePrice = price ?? product.price;
  const effectiveSupplierPrice = supplierPrice ?? product.supplierPrice;

  if (effectiveSupplierPrice > effectivePrice) {
    const error = new Error('El costo del proveedor no puede ser mayor que el precio de venta.');
    error.statusCode = 400;
    throw error;
  }
  // ─────────────────────────────────────────────────────────────────────────

  return prisma.product.update({
    where: { id },
    data: { name, description, price, supplierPrice, stock },
  });
};

/**
 * Elimina un producto.
 * ⚠️  Valida que el producto pertenezca al proveedor que hace la petición.
 */
const deleteProduct = async (id, supplierId) => {
  const product = await getProductById(id);

  // ── Validación de ownership ───────────────────────────────────────────────
  if (product.supplierId !== supplierId) {
    const error = new Error('No autorizado: este producto no te pertenece.');
    error.statusCode = 403;
    throw error;
  }
  // ─────────────────────────────────────────────────────────────────────────

  return prisma.product.delete({ where: { id } });
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
