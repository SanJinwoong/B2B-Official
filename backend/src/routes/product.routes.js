const { Router } = require('express');
const productController = require('../controllers/product.controller');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { createProductSchema, updateProductSchema } = require('../schemas/product.schema');

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS PÚBLICAS (cualquier usuario, sin token)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/products        → listar todos los productos
router.get('/', productController.getAllProducts);

// GET /api/products/:id    → ver detalle de un producto
router.get('/:id', productController.getProductById);

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS PROTEGIDAS (requieren token válido + rol SUPPLIER)
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/products       → crear producto
// 🔒 authenticate → verifica que el token JWT sea válido
// 🔒 authorize('SUPPLIER') → verifica que el rol sea SUPPLIER
// ✅ validate → rechaza body inválido antes de llegar al controller
router.post(
  '/',
  authenticate,
  authorize('SUPPLIER'),
  validate(createProductSchema),
  productController.createProduct
);

// PUT /api/products/:id    → editar producto (solo el dueño)
// 🔒 authenticate + authorize('SUPPLIER') + validación de ownership en el servicio
// ✅ validate → rechaza body inválido antes de llegar al controller
router.put(
  '/:id',
  authenticate,
  authorize('SUPPLIER'),
  validate(updateProductSchema),
  productController.updateProduct
);

// DELETE /api/products/:id → eliminar producto (solo el dueño)
// 🔒 authenticate + authorize('SUPPLIER') + validación de ownership en el servicio
router.delete(
  '/:id',
  authenticate,
  authorize('SUPPLIER'),
  productController.deleteProduct
);

module.exports = router;

