const { z } = require('zod');

/**
 * Schema para PATCH /api/admin/users/:id
 * Permite cambiar el rol y/o el estado activo de un usuario.
 * Al menos uno de los dos campos debe estar presente.
 */
const updateUserSchema = z
  .object({
    role: z
      .enum(['ADMIN', 'CLIENT', 'SUPPLIER'], {
        errorMap: () => ({ message: 'El rol debe ser ADMIN, CLIENT o SUPPLIER.' }),
      })
      .optional(),

    isActive: z
      .boolean({ invalid_type_error: 'isActive debe ser true o false.' })
      .optional(),
  })
  .refine(
    (data) => data.role !== undefined || data.isActive !== undefined,
    { message: 'Debes enviar al menos un campo: role o isActive.' }
  );

module.exports = { updateUserSchema };
