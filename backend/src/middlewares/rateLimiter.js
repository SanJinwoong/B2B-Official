/**
 * rateLimiter.js — express-rate-limit (real, no mock)
 *
 * Protege el endpoint público POST /api/supplier-applications contra
 * envíos automatizados y fuerza bruta.
 *
 * Límite: 5 solicitudes por IP cada 15 minutos.
 *
 * Nota académica:
 *   - El store por defecto es en memoria (MemoryStore).
 *   - En producción con múltiples instancias Node, usar RedisStore para
 *     compartir contadores entre procesos.
 */
const { rateLimit } = require('express-rate-limit');

const applicationRateLimiter = rateLimit({
  windowMs:       15 * 60 * 1000, // Ventana de 15 minutos
  max:            5,               // Máximo de solicitudes por IP en la ventana
  standardHeaders: true,           // Incluye RateLimit-* headers (RFC 6585)
  legacyHeaders:   false,          // Desactiva X-RateLimit-* (obsoletos)
  skipSuccessfulRequests: false,   // Conta también las 201 — evita spam de éxito

  message: {
    error: 'Demasiadas solicitudes desde esta IP. Intenta de nuevo en 15 minutos.',
  },

  // Handler personalizado para loguear el bloqueo en la terminal
  handler: (req, res, _next, options) => {
    console.warn(
      `[RATE LIMIT] IP bloqueada: ${req.ip} — ` +
      `${options.max} solicitudes superadas en ventana de ${options.windowMs / 60000} min`
    );
    res.status(429).json(options.message);
  },
});

module.exports = { applicationRateLimiter };
