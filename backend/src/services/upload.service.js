const multer = require('multer');
const path   = require('path');
const crypto = require('crypto');
const fs     = require('fs');

// ── Directorio de destino ─────────────────────────────────────────────────────
// Ruta relativa a la raíz del backend.
// ⚠️  Este directorio NUNCA debe registrarse en express.static().
const UPLOAD_DIR = path.resolve(__dirname, '../../storage/uploads/private');

// Crea el directorio si no existe (por si .gitkeep no está)
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ── Tipos MIME permitidos ──────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

// Extensiones permitidas (doble validación: MIME + extensión)
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

// ── diskStorage ───────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },

  filename: (_req, file, cb) => {
    // Nombre final: <token_hex>-<timestamp>-<nombre_original_sin_espacios>
    // El token evita colisiones y enumeración de archivos.
    const token     = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    const safeName  = file.originalname.replace(/\s+/g, '_');
    cb(null, `${token}-${timestamp}-${safeName}`);
  },
});

// ── Filtro de archivo ─────────────────────────────────────────────────────────
const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ALLOWED_MIME_TYPES.has(file.mimetype) && ALLOWED_EXTENSIONS.has(ext)) {
    // Archivo válido — aceptar
    cb(null, true);
  } else {
    // Archivo inválido — crear un error tipado para distinguirlo en el controller
    const err = new Error(
      `Tipo de archivo no permitido: "${file.originalname}". ` +
      'Solo se aceptan PDF, JPG y PNG.'
    );
    err.code       = 'INVALID_FILE_TYPE';
    err.statusCode = 400;
    cb(err, false);
  }
};

// ── Instancia de Multer ───────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize:  10 * 1024 * 1024, // 10 MB por archivo
    files:     5,                 // máximo 5 archivos por solicitud
  },
});

// ── Manejador de errores de Multer (helper para controllers) ──────────────────
/**
 * Envuelve el middleware de Multer en una Promise para poder usar try/catch
 * en los controllers en lugar de callbacks anidados.
 *
 * Uso:
 *   await handleUpload(upload.array('documents', 5))(req, res);
 */
const handleUpload = (multerMiddleware) => (req, res) =>
  new Promise((resolve, reject) => {
    multerMiddleware(req, res, (err) => {
      if (!err) return resolve();

      // Error de tipo de archivo (nuestro fileFilter)
      if (err.code === 'INVALID_FILE_TYPE') return reject(err);

      // Error de límite de Multer (tamaño, cantidad)
      if (err.code === 'LIMIT_FILE_SIZE') {
        const e = new Error('El archivo supera el tamaño máximo permitido de 10 MB.');
        e.code       = 'LIMIT_FILE_SIZE';
        e.statusCode = 400;
        return reject(e);
      }

      if (err.code === 'LIMIT_FILE_COUNT') {
        const e = new Error('Se permiten máximo 5 archivos por solicitud.');
        e.code       = 'LIMIT_FILE_COUNT';
        e.statusCode = 400;
        return reject(e);
      }

      // Error genérico de Multer
      reject(err);
    });
  });

module.exports = { upload, handleUpload, UPLOAD_DIR };
