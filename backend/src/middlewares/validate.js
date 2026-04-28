const { z } = require('zod');

/**
 * Middleware factory de validación con Zod.
 *
 * Uso en routes:
 *   router.post('/register', validate(registerSchema), authController.register);
 *
 * Valida req.body contra el schema provisto.
 * - Si falla → 400 con errores detallados por campo.
 * - Si pasa  → reemplaza req.body con el valor parseado (coercionado y limpio)
 *              y llama a next().
 *
 * @param {import('zod').ZodTypeAny} schema
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errorList = result.error.errors || result.error.issues || [];
    const errors = errorList.map((err) => ({
      field: err.path ? err.path.join('.') : 'unknown',
      message: err.message,
    }));

    return res.status(400).json({
      message: 'Error de validación.',
      errors,
    });
  }

  // Sustituye el body con el valor parseado y sanitizado por Zod
  req.body = result.data;
  next();
};

module.exports = validate;
