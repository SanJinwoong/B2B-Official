import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { productsApi } from '../api/api';
import { useAuth } from '../context/AuthContext';

const ProductsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estado del formulario de creación (solo SUPPLIER)
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: '', stock: '' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const isSupplier = user?.role === 'SUPPLIER';
  const isAdmin    = user?.role === 'ADMIN';

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await productsApi.getAll();
      setProducts(data.data);
    } catch {
      setError('No se pudieron cargar los productos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      await productsApi.create({
        name: form.name,
        description: form.description || undefined,
        price: parseFloat(form.price),
        stock: parseInt(form.stock, 10),
      });
      setForm({ name: '', description: '', price: '', stock: '' });
      setShowForm(false);
      await fetchProducts();
    } catch (err) {
      const response = err.response?.data;
      if (response?.errors) {
        setFormError(response.errors.map((e) => e.message).join(' · '));
      } else {
        setFormError(response?.message || 'Error al crear el producto.');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este producto?')) return;
    try {
      await productsApi.remove(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'No se pudo eliminar el producto.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="page-container">
      {/* ── Navbar ── */}
      <header className="navbar">
        <div className="navbar-left">
          <span className="navbar-brand">B2B Platform</span>
          {/* Link al panel admin solo visible para el rol ADMIN */}
          {isAdmin && (
            <nav className="admin-nav">
              <Link to="/admin/users" className="admin-nav-link">👤 Usuarios</Link>
              <Link to="/admin/orders" className="admin-nav-link">📦 Pedidos</Link>
            </nav>
          )}
        </div>
        <div className="navbar-right">
          <span className="navbar-user">
            {user?.name} <span className="role-badge">{user?.role}</span>
          </span>
          <button className="btn btn-outline" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="page-header">
          <h2>Productos</h2>
          {isSupplier && (
            <button
              className="btn btn-primary"
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? 'Cancelar' : '+ Nuevo Producto'}
            </button>
          )}
        </div>

        {/* ── Formulario de creación (solo SUPPLIER) ── */}
        {isSupplier && showForm && (
          <form className="product-form" onSubmit={handleCreate}>
            <h3>Nuevo Producto</h3>
            {formError && <div className="alert alert-error">{formError}</div>}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="prod-name">Nombre *</label>
                <input
                  id="prod-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Nombre del producto"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="prod-description">Descripción</label>
                <input
                  id="prod-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="prod-price">Precio *</label>
                <input
                  id="prod-price"
                  name="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="prod-stock">Stock *</label>
                <input
                  id="prod-stock"
                  name="stock"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={handleChange}
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={formLoading}>
              {formLoading ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </form>
        )}

        {/* ── Lista de productos ── */}
        {loading && <p className="status-msg">Cargando productos...</p>}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && products.length === 0 && (
          <p className="status-msg">No hay productos disponibles.</p>
        )}

        {!loading && products.length > 0 && (
          <div className="product-grid">
            {products.map((product) => (
              <div key={product.id} className="product-card">
                <div className="product-card-header">
                  <h3>{product.name}</h3>
                  <span className="price">${product.price.toFixed(2)}</span>
                </div>

                {product.description && (
                  <p className="product-description">{product.description}</p>
                )}

                <div className="product-meta">
                  <span className={`stock-badge ${product.stock === 0 ? 'out' : ''}`}>
                    Stock: {product.stock}
                  </span>
                  <span className="supplier-name">
                    Por: {product.supplier?.name}
                  </span>
                </div>

                {/* Solo el SUPPLIER dueño ve los botones de acción */}
                {isSupplier && product.supplierId === user?.id && (
                  <div className="product-actions">
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(product.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ProductsPage;
