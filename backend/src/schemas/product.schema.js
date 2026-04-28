const { z } = require('zod');

const createProductSchema = z.object({
  name: z
    .string({ required_error: 'El nombre del producto es obligatorio.' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.'),

  description: z.string().trim().optional(),

  price: z
    .number({ required_error: 'El precio es obligatorio.', invalid_type_error: 'El precio debe ser un número.' })
    .positive('El precio debe ser mayor a 0.'),

  supplierPrice: z
    .number({ required_error: 'El precio proveedor es obligatorio.', invalid_type_error: 'El precio proveedor debe ser un número.' })
    .positive('El precio proveedor debe ser mayor a 0.'),

  stock: z
    .number({ required_error: 'El stock es obligatorio.', invalid_type_error: 'El stock debe ser un número.' })
    .int('El stock debe ser un número entero.')
    .min(0, 'El stock no puede ser negativo.'),
}).refine(
  (data) => data.supplierPrice <= data.price,
  { message: 'El costo del proveedor no puede ser mayor que el precio de venta.', path: ['supplierPrice'] }
);


const updateProductSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').optional(),
  description: z.string().trim().optional(),

  price: z
    .number({ invalid_type_error: 'El precio debe ser un número.' })
    .positive('El precio debe ser mayor a 0.')
    .optional(),

  supplierPrice: z
    .number({ invalid_type_error: 'El precio proveedor debe ser un número.' })
    .positive('El precio proveedor debe ser mayor a 0.')
    .optional(),

  stock: z
    .number({ invalid_type_error: 'El stock debe ser un número.' })
    .int('El stock debe ser un número entero.')
    .min(0, 'El stock no puede ser negativo.')
    .optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Debes enviar al menos un campo para actualizar.' }
).refine(
  (data) => {
    // Si envían ambos, validamos
    if (data.price !== undefined && data.supplierPrice !== undefined) {
      return data.supplierPrice <= data.price;
    }
    return true; // Si no envían ambos, la validación se hace en el service contra los valores de BD
  },
  { message: 'El costo del proveedor no puede ser mayor que el precio de venta.', path: ['supplierPrice'] }
);

module.exports = { createProductSchema, updateProductSchema };

