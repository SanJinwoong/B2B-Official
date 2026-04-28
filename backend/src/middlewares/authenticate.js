const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticación.
 * Verifica que el token JWT sea válido y adjunta `req.user` con { id, role }.
 * 
 * Uso: router.get('/ruta-protegida', authenticate, controller)
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token de acceso no proporcionado.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, iat, exp }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'El token ha expirado.' });
    }
    return res.status(401).json({ message: 'Token inválido.' });
  }
};

module.exports = authenticate;
