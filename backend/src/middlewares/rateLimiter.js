/**
 * rateLimiter.js — express-rate-limit (real, no mock)
 *
 * Protege el endpoint público POST /api/supplier-applications contra
 * envíos automatizados y fuerza bruta.
 *
 * Límite en producción : 5 solicitudes por IP cada 15 minutos.
 * Límite en desarrollo : 30 solicitudes por IP cada 15 minutos
 *                        (los envíos exitosos no cuentan → facilita pruebas).
 *
 * Nota: El store por defecto es en memoria (MemoryStore).
 * En producción con múltiples instancias Node, usar RedisStore.
 */
const { rateLimit } = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

const applicationRateLimiter = rateLimit({
  windowMs:       15 * 60 * 1000,  // Ventana de 15 minutos
  max:            isDev ? 30 : 5,  // 30 en dev, 5 en producción
  standardHeaders: true,
  legacyHeaders:   false,
  // En desarrollo, los 201 exitosos no suman al contador → puedes probar sin bloquearte
  skipSuccessfulRequests: isDev,

  message: {
    error: 'Demasiadas solicitudes desde esta IP. Intenta de nuevo en 15 minutos.',
  },

  handler: (req, res, _next, options) => {
    console.warn(
      `[RATE LIMIT] IP bloqueada: ${req.ip} — ` +
      `${options.max} solicitudes superadas en ventana de ${options.windowMs / 60000} min`
    );
    res.status(429).json(options.message);
  },
});

module.exports = { applicationRateLimiter };
