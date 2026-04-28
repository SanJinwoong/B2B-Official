/**
 * Middleware de manejo de errores global.
 * Debe registrarse al FINAL de todos los middlewares en app.js.
 *
 * Captura errores lanzados desde servicios o controladores a través de next(error).
 * Soporta la propiedad `statusCode` personalizada en el objeto de error.
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor.';

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${statusCode} - ${message}`);
    console.error(err.stack);
  }

  res.status(statusCode).json({
    error: {
      message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
};

module.exports = errorHandler;
