/**
 * supplier-application.schema.js
 *
 * Esquemas Zod para el flujo de registro de proveedores B2B.
 *
 * PROBLEMA DE FORMDATA
 * ─────────────────────
 * Todos los campos llegan como String desde multipart/form-data.
 * Usamos z.coerce.* para convertir antes de validar:
 *   - "500000" → number   (monthlyCapacity, leadTimeDays)
 *   - "true" / "1" / "on" → boolean  (hasExportExp)
 *
 * CERTIFICATIONS
 * ──────────────
 * El frontend puede enviar este campo de dos formas:
 *   a) JSON stringificado: '["ISO 9001:2015","HACCP"]'
 *   b) Múltiples valores repetidos en FormData → multer → string[]
 * Manejamos ambos con un pre-transform.
 */

const { z } = require('zod');

// ── Helper: boolean desde FormData ────────────────────────────────────────────
// Acepta: true | "true" | "1" | "on"  → true
//         false | cualquier otro valor → false
const coercedBoolean = z
  .union([z.boolean(), z.string()])
  .transform((val) => {
    if (typeof val === 'boolean') return val;
    return val === 'true' || val === '1' || val === 'on';
  });

// ── Helper: string[] desde FormData ──────────────────────────────────────────
// Acepta: string JSON, string único, string[], undefined/null → []
const coercedStringArray = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [val];
    }
  });

// ── Categorías válidas ────────────────────────────────────────────────────────
const VALID_CATEGORIES = [
  'manufactura', 'logistica', 'alimentaria', 'textil',
  'tecnologia', 'quimica', 'construccion', 'automotriz',
  'salud', 'otro',
];

// ── Paso 1: Información de la empresa ────────────────────────────────────────
const step1Shape = {
  companyName: z
    .string({ required_error: 'El nombre de la empresa es obligatorio.' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(200, 'El nombre no puede superar 200 caracteres.'),

  rfc: z
    .string({ required_error: 'El RFC es obligatorio.' })
    .trim()
    .min(12, 'El RFC debe tener entre 12 y 13 caracteres.')
    .max(13, 'El RFC debe tener entre 12 y 13 caracteres.')
    .toUpperCase(),

  website: z
    .string()
    .trim()
    .url('El sitio web debe ser una URL válida (ej. https://empresa.com).')
    .optional()
    .or(z.literal('')),

  /**
   * category — acepta:
   *   a) Un solo valor: "manufactura"
   *   b) Múltiples valores separados por coma: "manufactura, textil, tecnologia"
   *   c) Texto libre (cuando el usuario eligió "otro")  
   * Cada token se valida individualmente contra VALID_CATEGORIES.
   * Los tokens de tipo "otro" aceptan texto libre (customCategory del frontend).
   */
  category: z
    .string({ required_error: 'La categoría es obligatoria.' })
    .trim()
    .min(1, 'La categoría es obligatoria.')
    .refine(
      (val) => {
        // Partir por coma, limpiar espacios
        const tokens = val.split(',').map((t) => t.trim()).filter(Boolean);
        if (tokens.length === 0) return false;
        // Cada token debe ser un valor válido O ser texto libre (si vino de 'otro')
        // Si el frontend resolvió 'otro' por el customCategory, no hay nada que validar estrictamente
        // Solo validamos si el token coincide exactamente con uno de los valores enumerados
        // O si es texto libre (cuando el usuario escribe su propia categoría)
        return tokens.every((t) => VALID_CATEGORIES.includes(t) || t.length >= 2);
      },
      { message: 'Una o más categorías no son válidas.' }
    ),

  contactName: z
    .string({ required_error: 'El nombre del contacto es obligatorio.' })
    .trim()
    .min(2, 'El nombre del contacto debe tener al menos 2 caracteres.'),

  contactEmail: z
    .string({ required_error: 'El email corporativo es obligatorio.' })
    .trim()
    .email('El email corporativo no es válido.'),

  contactPhone: z
    .string({ required_error: 'El teléfono es obligatorio.' })
    .trim()
    .min(7, 'El teléfono debe tener al menos 7 dígitos.')
    .max(20, 'El teléfono no puede superar 20 caracteres.'),

  country: z
    .string({ required_error: 'El país es obligatorio.' })
    .trim()
    .min(2, 'El país debe tener al menos 2 caracteres.'),

  state: z
    .string({ required_error: 'El estado/provincia es obligatorio.' })
    .trim()
    .min(2, 'El estado debe tener al menos 2 caracteres.'),

  city: z
    .string({ required_error: 'La ciudad es obligatoria.' })
    .trim()
    .min(2, 'La ciudad debe tener al menos 2 caracteres.'),

  address: z.string().trim().optional(),
};

// ── Paso 2: Capacidad ─────────────────────────────────────────────────────────
const step2Shape = {
  monthlyCapacity: z.coerce
    .number({ invalid_type_error: 'La capacidad mensual debe ser un número.' })
    .int('La capacidad mensual debe ser un número entero.')
    .positive('La capacidad mensual debe ser mayor a 0.'),

  capacityUnit: z
    .string({ required_error: 'La unidad de capacidad es obligatoria.' })
    .trim()
    .min(1, 'Especifica la unidad (ej. piezas, kg, toneladas).'),

  leadTimeDays: z.coerce
    .number({ invalid_type_error: 'El lead time debe ser un número.' })
    .int('El lead time debe ser un número entero de días.')
    .min(1, 'El lead time debe ser al menos 1 día.')
    .max(365, 'El lead time no puede superar 365 días.'),

  hasExportExp: coercedBoolean.optional().default(false),

  description: z
    .string()
    .trim()
    .max(2000, 'La descripción no puede superar 2000 caracteres.')
    .optional(),

  certifications: coercedStringArray,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA 1 — Crear solicitud (POST /supplier-applications)
// Combina paso 1 + paso 2.
// ═══════════════════════════════════════════════════════════════════════════════
const createApplicationSchema = z.object({
  ...step1Shape,
  ...step2Shape,
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA 2 — Revisión del admin (reject / request-action)
// actionNote es siempre obligatorio para documentar la decisión.
// ═══════════════════════════════════════════════════════════════════════════════
const reviewApplicationSchema = z.object({
  actionNote: z
    .string({ required_error: 'El motivo de la decisión es obligatorio.' })
    .trim()
    .min(10, 'El motivo debe tener al menos 10 caracteres para ser informativo.')
    .max(1000, 'El motivo no puede superar 1000 caracteres.'),
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA 3 — Corrección con token (PATCH /supplier-applications/action/:token)
// El prospecto solo envía los campos que corrige.
// Requiere al menos un campo presente.
// ═══════════════════════════════════════════════════════════════════════════════
const updateActionSchema = z
  .object({
    companyName:     step1Shape.companyName.optional(),
    rfc:             step1Shape.rfc.optional(),
    website:         step1Shape.website,
    category:        step1Shape.category.optional(),
    contactName:     step1Shape.contactName.optional(),
    contactEmail:    step1Shape.contactEmail.optional(),
    contactPhone:    step1Shape.contactPhone.optional(),
    country:         step1Shape.country.optional(),
    state:           step1Shape.state.optional(),
    city:            step1Shape.city.optional(),
    address:         step1Shape.address,
    monthlyCapacity: step2Shape.monthlyCapacity.optional(),
    capacityUnit:    step2Shape.capacityUnit.optional(),
    leadTimeDays:    step2Shape.leadTimeDays.optional(),
    hasExportExp:    step2Shape.hasExportExp,
    description:     step2Shape.description,
    certifications:  step2Shape.certifications,
  })
  .refine(
    (data) => {
      const textFields = [
        'companyName', 'rfc', 'website', 'category',
        'contactName', 'contactEmail', 'contactPhone',
        'country', 'state', 'city', 'address',
        'monthlyCapacity', 'capacityUnit', 'leadTimeDays', 'description',
      ];
      const hasText  = textFields.some((k) => data[k] !== undefined);
      const hasCerts = Array.isArray(data.certifications) && data.certifications.length > 0;
      return hasText || hasCerts;
    },
    {
      message:
        'Debes enviar al menos un campo de texto o nuevas certificaciones para actualizar la solicitud.',
    }
  );

module.exports = { createApplicationSchema, reviewApplicationSchema, updateActionSchema };
