const productService = require('../services/product.service');

/**
 * GET /api/products
 * Público – sin restricciones de rol.
 */
const getAllProducts = async (req, res, next) => {
  try {
    const products = await productService.getAllProducts();
    res.status(200).json({ data: products });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products/:id
 * Público – sin restricciones de rol.
 */
const getProductById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const product = await productService.getProductById(id);
    res.status(200).json({ data: product });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/products
 * 🔒 Protegido: authenticate + authorize('SUPPLIER')
 * El supplierId se extrae de req.user (JWT), no del body.
 */
const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, supplierPrice, stock } = req.body;
    const supplierId = req.user.id; // ← viene del JWT, no del cliente

    const product = await productService.createProduct(
      { name, description, price, supplierPrice, stock },
      supplierId
    );

    res.status(201).json({
      message: 'Producto creado exitosamente.',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/products/:id
 * 🔒 Protegido: authenticate + authorize('SUPPLIER')
 * El servicio valida que el producto pertenezca al proveedor autenticado.
 */
const updateProduct = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, price, supplierPrice, stock } = req.body;
    const supplierId = req.user.id; // ← viene del JWT, no del cliente

    const product = await productService.updateProduct(
      id,
      { name, description, price, supplierPrice, stock },
      supplierId
    );

    res.status(200).json({
      message: 'Producto actualizado exitosamente.',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/products/:id
 * 🔒 Protegido: authenticate + authorize('SUPPLIER')
 * El servicio valida que el producto pertenezca al proveedor autenticado.
 */
const deleteProduct = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const supplierId = req.user.id; // ← viene del JWT, no del cliente

    await productService.deleteProduct(id, supplierId);

    res.status(200).json({ message: 'Producto eliminado exitosamente.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
