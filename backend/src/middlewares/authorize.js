/**
 * Middleware de autorización basado en roles.
 * Recibe uno o varios roles permitidos y verifica que el usuario autenticado
 * tenga alguno de esos roles.
 *
 * IMPORTANTE: Debe usarse siempre DESPUÉS del middleware `authenticate`.
 *
 * Uso:
 *   router.get('/admin', authenticate, authorize('ADMIN'), controller)
 *   router.get('/proveedor', authenticate, authorize('ADMIN', 'SUPPLIER'), controller)
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}.`,
      });
    }

    next();
  };
};

module.exports = authorize;
