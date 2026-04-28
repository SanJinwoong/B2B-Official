/**
 * client-profile.schema.js
 *
 * Validación Zod para el perfil empresarial del cliente (Fase 2).
 */
const { z } = require('zod');

const BUSINESS_TYPES = [
  'E-commerce',
  'Retail físico',
  'Mayorista/Distribuidor',
  'Fabricante',
  'Importador',
  'Otro',
];

const clientProfileSchema = z.object({
  companyName: z
    .string({ required_error: 'La razón social es obligatoria.' })
    .trim()
    .min(2, 'La razón social debe tener al menos 2 caracteres.')
    .max(200),

  taxId: z
    .string({ required_error: 'El RFC / ID fiscal es obligatorio.' })
    .trim()
    .min(6, 'El ID fiscal debe tener al menos 6 caracteres.')
    .max(20),

  businessType: z
    .enum(BUSINESS_TYPES, {
      errorMap: () => ({ message: `El tipo de negocio debe ser uno de: ${BUSINESS_TYPES.join(', ')}.` }),
    }),

  commercialAddress: z
    .string({ required_error: 'La dirección comercial es obligatoria.' })
    .trim()
    .min(5, 'La dirección debe tener al menos 5 caracteres.')
    .max(500),

  // null = usar la misma dirección comercial
  shippingAddress: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable(),

  website: z
    .string()
    .trim()
    .url('El sitio web debe ser una URL válida (ej. https://empresa.com).')
    .optional()
    .or(z.literal(''))
    .nullable(),
});

module.exports = { clientProfileSchema };
