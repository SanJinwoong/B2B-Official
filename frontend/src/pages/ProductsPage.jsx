/**
 * ProductsPage.jsx
 *
 * Sin navbar propio — usa el Navbar.jsx permanente del App.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { productsApi } from '../api/api';
import { useAuth }     from '../context/AuthContext';

const ProductsPage = () => {
  const { user } = useAuth();

  const [products,     setProducts]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [showForm,     setShowForm]     = useState(false);
  const [form,         setForm]         = useState({ name: '', description: '', price: '', stock: '' });
  const [formError,    setFormError]    = useState('');
  const [formLoading,  setFormLoading]  = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const isSupplier        = user?.role === 'SUPPLIER';
  const isClient          = user?.role === 'CLIENT';
  const profileIncomplete = isClient && !user?.profileCompleted;

  // ── Carga de productos ────────────────────────────────────────────────────
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

  useEffect(() => { fetchProducts(); }, []);

  // ── Formulario de creación (SUPPLIER) ─────────────────────────────────────
  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      await productsApi.create({
        name:        form.name,
        description: form.description || undefined,
        price:       parseFloat(form.price),
        stock:       parseInt(form.stock, 10),
      });
      setForm({ name: '', description: '', price: '', stock: '' });
      setShowForm(false);
      await fetchProducts();
    } catch (err) {
      const res = err.response?.data;
      setFormError(
        res?.errors ? res.errors.map((e) => e.message).join(' · ')
                    : res?.message || 'Error al crear el producto.'
      );
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page-container">
      <main className="main-content">

        {/* ── Banner: perfil empresarial incompleto (solo CLIENT) ── */}
        {profileIncomplete && (
          <div style={{
            background: 'var(--accent-light, #eff6ff)',
            border: '1px solid var(--accent-border, #93c5fd)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            flexWrap: 'wrap',
          }}>
            <AlertTriangle size={20} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: '200px' }}>
              <p style={{ margin: '0 0 2px', fontWeight: 700, color: 'var(--accent)', fontSize: '14px' }}>
                Completa tu perfil empresarial para operar
              </p>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
                Necesitas el perfil completo para solicitar cotizaciones y realizar pedidos.
              </p>
            </div>
            <Link
              to="/completar-perfil"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '9px 18px',
                background: 'var(--accent)', color: '#fff',
                borderRadius: '8px', textDecoration: 'none',
                fontWeight: 600, fontSize: '13px', flexShrink: 0,
              }}
            >
              Completar ahora <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* ── Modal bloqueante: cotizar sin perfil ── */}
        {showProfileModal && (
          <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }} onClick={() => setShowProfileModal(false)}>
            <div style={{
              background: 'var(--surface, #fff)',
              borderRadius: '16px', padding: '32px',
              maxWidth: '420px', width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              textAlign: 'center',
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '14px',
                background: 'var(--accent-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <AlertTriangle size={26} style={{ color: 'var(--accent)' }} />
              </div>
              <h3 style={{ color: 'var(--text)', marginBottom: '8px', fontSize: '1.1rem' }}>
                Perfil empresarial requerido
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px', lineHeight: 1.6 }}>
                Para solicitar cotizaciones y realizar pedidos necesitas completar tu perfil empresarial.
                Solo toma 2 minutos.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={() => setShowProfileModal(false)}
                  style={{
                    padding: '9px 18px', borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'transparent', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: '13px',
                  }}
                >
                  Ahora no
                </button>
                <Link
                  to="/completar-perfil"
                  style={{
                    padding: '9px 20px', borderRadius: '8px',
                    background: 'var(--accent)', color: '#fff',
                    textDecoration: 'none', fontWeight: 600, fontSize: '13px',
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  Completar perfil <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Cabecera de página ── */}
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
                  id="prod-name" name="name" value={form.name}
                  onChange={handleChange} placeholder="Nombre del producto" required
                />
              </div>
              <div className="form-group">
                <label htmlFor="prod-description">Descripción</label>
                <input
                  id="prod-description" name="description" value={form.description}
                  onChange={handleChange} placeholder="Opcional"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="prod-price">Precio *</label>
                <input
                  id="prod-price" name="price" type="number"
                  min="0.01" step="0.01" value={form.price}
                  onChange={handleChange} placeholder="0.00" required
                />
              </div>
              <div className="form-group">
                <label htmlFor="prod-stock">Stock *</label>
                <input
                  id="prod-stock" name="stock" type="number"
                  min="0" step="1" value={form.stock}
                  onChange={handleChange} placeholder="0" required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={formLoading}>
              {formLoading ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </form>
        )}

        {/* ── Lista de productos ── */}
        {loading  && <p className="status-msg">Cargando productos...</p>}
        {error    && <div className="alert alert-error">{error}</div>}

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
