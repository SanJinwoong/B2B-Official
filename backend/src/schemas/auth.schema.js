const { z } = require('zod');

const registerSchema = z.object({
  name: z
    .string({ required_error: 'El nombre es obligatorio.' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.'),

  email: z
    .string({ required_error: 'El correo es obligatorio.' })
    .email('El correo no tiene un formato válido.'),

  password: z
    .string({ required_error: 'La contraseña es obligatoria.' })
    .min(6, 'La contraseña debe tener al menos 6 caracteres.'),

  role: z
    .enum(['ADMIN', 'CLIENT', 'SUPPLIER'], {
      errorMap: () => ({ message: 'El rol debe ser ADMIN, CLIENT o SUPPLIER.' }),
    })
    .optional()
    .default('CLIENT'),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'El correo es obligatorio.' })
    .email('El correo no tiene un formato válido.'),

  password: z
    .string({ required_error: 'La contraseña es obligatoria.' })
    .min(1, 'La contraseña es obligatoria.'),
});

module.exports = { registerSchema, loginSchema };
