/**
 * DTOs de órdenes — transforman la respuesta según el rol del usuario.
 *
 * Reglas de visibilidad de montos:
 *  - CLIENT   → ve clientAmount (lo que pagó). NO ve supplierAmount ni margin.
 *  - SUPPLIER → ve supplierAmount (su costo). NO ve clientAmount ni margin.
 *  - ADMIN    → ve clientAmount, supplierAmount y margin calculado.
 *
 * Reglas de datos personales:
 *  - CLIENT   → NO ve supplierId ni datos del proveedor en items.
 *  - SUPPLIER → NO ve clientId ni datos del cliente.
 *  - ADMIN    → ve todo sin filtro.
 */

// ── Helpers de cálculo ────────────────────────────────────────────────────────

const round2 = (n) => parseFloat(n.toFixed(2));

// ── Transformación de OrderItem por rol ───────────────────────────────────────

const itemForClient = (item) => ({
  id:        item.id,
  productId: item.productId,
  quantity:  item.quantity,
  unitPrice: item.unitPrice,         // precio cliente (con margen)
  subtotal:  round2(item.quantity * item.unitPrice),
  product: item.product
    ? { id: item.product.id, name: item.product.name, images: item.product.images }
    : null,
  // ❌ NO supplierUnitPrice — el cliente no ve el costo del proveedor
  // ❌ NO product.supplierPrice
});

const itemForSupplier = (item) => ({
  id:               item.id,
  quantity:         item.quantity,
  supplierUnitPrice: item.supplierUnitPrice, // costo del proveedor
  subtotal:         round2(item.quantity * item.supplierUnitPrice),
  product: item.product
    ? { id: item.product.id, name: item.product.name, supplierPrice: item.product.supplierPrice }
    : null,
  // ❌ NO unitPrice (precio cliente) — el proveedor no ve el precio con margen
});

const itemForAdmin = (item) => ({
  id:                item.id,
  quantity:          item.quantity,
  unitPrice:         item.unitPrice,
  supplierUnitPrice: item.supplierUnitPrice,
  margin:            round2(item.unitPrice - item.supplierUnitPrice),
  clientSubtotal:    round2(item.quantity * item.unitPrice),
  supplierSubtotal:  round2(item.quantity * item.supplierUnitPrice),
  product: item.product ?? null,
});

// ── Transformaciones de Order completa ───────────────────────────────────────

/**
 * Vista CLIENT: ve clientAmount, sus items sin datos de proveedor.
 */
const orderForClient = (order) => ({
  id:           order.id,
  orderNumber:  order.orderNumber,
  status:       order.status,
  sampleStatus: order.sampleStatus,
  deliveryDate: order.deliveryDate,
  clientAmount: order.clientAmount ?? order.totalAmount, // fallback para órdenes viejas
  createdAt:    order.createdAt,
  updatedAt:    order.updatedAt,
  orderItems:   order.orderItems?.map(itemForClient) ?? [],
  phases:       order.phases ?? [],
  documents:    order.documents ?? [],
  payments:     order.payments ?? [],
  // ❌ NO clientId (redundante para el cliente)
  // ❌ NO supplierAmount
  // ❌ NO margin
});

/**
 * Vista SUPPLIER: ve supplierAmount, sin datos del cliente.
 * Filtra los ítems de la orden para que el proveedor solo vea sus propios productos.
 */
const orderForSupplier = (order, userId) => {
  const filteredItems = order.orderItems?.filter(item => item.product?.supplierId === userId) ?? [];
  const calculatedSupplierAmount = filteredItems.reduce((sum, item) => sum + (item.quantity * item.supplierUnitPrice), 0);

  return {
    id:             order.id,
    status:         order.status,
    supplierAmount: round2(calculatedSupplierAmount),
    createdAt:      order.createdAt,
    updatedAt:      order.updatedAt,
    orderItems:     filteredItems.map(itemForSupplier),
    // ❌ NO clientId ni client
    // ❌ NO clientAmount
    // ❌ NO margin
  };
};

/**
 * Vista ADMIN: ve todo + margin calculado en tiempo real.
 */
const orderForAdmin = (order) => ({
  id:             order.id,
  orderNumber:    order.orderNumber,
  status:         order.status,
  sampleStatus:   order.sampleStatus,
  deliveryDate:   order.deliveryDate,
  clientAmount:   order.clientAmount ?? order.totalAmount,
  supplierAmount: order.supplierAmount,
  margin:         round2((order.clientAmount ?? order.totalAmount) - order.supplierAmount),
  clientId:       order.clientId,
  client:         order.client ?? null,
  createdAt:      order.createdAt,
  updatedAt:      order.updatedAt,
  orderItems:     order.orderItems?.map(itemForAdmin) ?? [],
  phases:         order.phases ?? [],
  documents:      order.documents ?? [],
  payments:       order.payments ?? [],
});

// ── Función principal de transformación ──────────────────────────────────────

/**
 * Transforma una orden según el rol del usuario autenticado.
 */
const applyOrderDto = (order, role, userId) => {
  switch (role) {
    case 'CLIENT':   return orderForClient(order);
    case 'SUPPLIER': return orderForSupplier(order, userId);
    case 'ADMIN':    return orderForAdmin(order);
    default:         return orderForClient(order);
  }
};

/**
 * Aplica el DTO a un array de órdenes.
 */
const applyOrderDtoList = (orders, role, userId) => orders.map((o) => applyOrderDto(o, role, userId));

module.exports = { applyOrderDto, applyOrderDtoList };

