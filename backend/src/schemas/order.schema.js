const { z } = require('zod');

const orderItemSchema = z.object({
  productId: z
    .number({ required_error: 'productId es obligatorio.', invalid_type_error: 'productId debe ser un número.' })
    .int('productId debe ser un número entero.')
    .positive('productId debe ser mayor a 0.'),

  quantity: z
    .number({ required_error: 'quantity es obligatorio.', invalid_type_error: 'quantity debe ser un número.' })
    .int('quantity debe ser un número entero.')
    .positive('La cantidad debe ser mayor a 0.'),
});

const createOrderSchema = z.object({
  items: z
    .array(orderItemSchema, { required_error: 'El campo items es obligatorio.' })
    .min(1, 'Debes enviar al menos un producto en items.'),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'SHIPPED', 'DELIVERED'], {
    required_error: 'El estado es obligatorio.',
    errorMap: () => ({
      message: 'El estado debe ser PENDING, APPROVED, SHIPPED o DELIVERED.',
    }),
  }),
});

module.exports = { createOrderSchema, updateOrderStatusSchema };
