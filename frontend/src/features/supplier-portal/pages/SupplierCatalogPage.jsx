import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Grid, List, Edit2, Trash2, Eye, EyeOff, Package, Star } from 'lucide-react';
import { supplierCatalogApi } from '../../../api/api';
import ProductFormPage from '../components/ProductFormPage';
import '../components/supplier-catalog.css';

const STATUS_COLORS = {
  ACTIVE:   { bg: '#dcfce7', color: '#15803d', label: 'Activo' },
  DRAFT:    { bg: '#fef3c7', color: '#b45309', label: 'Borrador' },
  INACTIVE: { bg: '#f1f5f9', color: '#64748b', label: 'Inactivo' },
};

const SALE_TYPE_LABEL = {
  WHOLESALE: 'Mayoreo',
  RETAIL:    'Menudeo',
  BOTH:      'Ambos',
};

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export default function SupplierCatalogPage() {
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilter]   = useState('ALL');
  const [view, setView]             = useState('grid');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [deleting, setDeleting]     = useState(null);
  const debounceRef = useRef(null);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterStatus !== 'ALL') params.status = filterStatus;
      const r = await supplierCatalogApi.getCatalog(params);
      setProducts(r.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchCatalog, 300);
  }, [search, filterStatus]);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este producto del catálogo?')) return;
    try {
      await supplierCatalogApi.remove(id);
      setProducts(ps => ps.filter(p => p.id !== id));
    } catch(e) { alert(e.response?.data?.message || 'Error al eliminar.'); }
  };

  const handleToggleStatus = async (product) => {
    const newStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await supplierCatalogApi.update(product.id, { status: newStatus });
      setProducts(ps => ps.map(p => p.id === product.id ? { ...p, status: newStatus } : p));
    } catch(e) { alert('Error al cambiar estado.'); }
  };

  const handleSaved = (saved) => {
    if (editing) {
      setProducts(ps => ps.map(p => p.id === saved.id ? saved : p));
    } else {
      setProducts(ps => [saved, ...ps]);
    }
    setModalOpen(false);
    setEditing(null);
  };

  const counts = {
    ALL:      products.length,
    ACTIVE:   products.filter(p => p.status === 'ACTIVE').length,
    DRAFT:    products.filter(p => p.status === 'DRAFT').length,
    INACTIVE: products.filter(p => p.status === 'INACTIVE').length,
  };

  const primaryImage = (p) => p.images?.find(i => i.isPrimary)?.url || p.images?.[0]?.url || null;

  return (
    <div>
      {/* ── Header ── */}
      <div className="sc-header">
        <div>
          <h1 className="sp-page-title">Mi Catálogo de Productos</h1>
          <p className="sp-page-sub">Gestiona los productos que publicas en el marketplace.</p>
        </div>
        <button className="sc-btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus size={16} /> Publicar Producto
        </button>
      </div>

      {/* ── Stats strip ── */}
      <div className="sc-stats-strip">
        {[['ALL','Todos','#2563eb'],['ACTIVE','Activos','#16a34a'],['DRAFT','Borradores','#d97706'],['INACTIVE','Inactivos','#64748b']].map(([k, label, color]) => (
          <button key={k} className={`sc-stat-chip${filterStatus === k ? ' active' : ''}`}
            style={{ '--chip-color': color }} onClick={() => setFilter(k)}>
            <span className="sc-stat-num" style={{ color }}>{counts[k]}</span>
            <span className="sc-stat-label">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="sc-toolbar">
        <div className="sc-search-wrap">
          <Search size={15} className="sc-search-icon" />
          <input className="sc-search" placeholder="Buscar productos..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="sc-view-toggle">
          <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}><Grid size={16} /></button>
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}><List size={16} /></button>
        </div>
      </div>

      {/* ── Loading / Empty ── */}
      {loading && <div className="sc-loading"><div className="sc-spinner" /><span>Cargando catálogo...</span></div>}

      {!loading && products.length === 0 && (
        <div className="sc-empty">
          <Package size={48} strokeWidth={1} />
          <h3>Aún no tienes productos publicados</h3>
          <p>Publica tu primer producto para aparecer en el marketplace B2B</p>
          <button className="sc-btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={16} /> Publicar mi primer producto
          </button>
        </div>
      )}

      {/* ── Grid View ── */}
      {!loading && products.length > 0 && view === 'grid' && (
        <div className="sc-grid">
          {products.map(p => {
            const sc = STATUS_COLORS[p.status] || STATUS_COLORS.INACTIVE;
            const img = primaryImage(p);
            return (
              <div key={p.id} className="sc-card">
                {/* Image */}
                <div className="sc-card-img">
                  {img ? <img src={img} alt={p.name} /> : <Package size={32} strokeWidth={1} />}
                  <span className="sc-card-badge" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                  <div className="sc-card-type">{SALE_TYPE_LABEL[p.saleType] || p.saleType}</div>
                </div>
                {/* Body */}
                <div className="sc-card-body">
                  <div className="sc-card-cat">{p.category}</div>
                  <div className="sc-card-name" title={p.name}>{p.name}</div>
                  {p.brand && <div className="sc-card-brand">{p.brand}</div>}
                  <div className="sc-card-meta">
                    <span><strong>MOQ:</strong> {p.moq?.toLocaleString()} {p.unit}</span>
                    <span><strong>Lead:</strong> {p.leadTimeDays}d</span>
                  </div>
                  <div className="sc-card-price-row">
                    <div className="sc-card-price">{fmt(p.price)}<span>/{p.unit}</span></div>
                    <div className="sc-card-stock">Stock: {p.stock?.toLocaleString()}</div>
                  </div>
                  {p.avgRating > 0 && (
                    <div className="sc-card-rating">
                      <Star size={11} fill="#fbbf24" color="#fbbf24" />
                      <span>{p.avgRating.toFixed(1)}</span>
                      <span className="sc-rating-count">({p.ratingCount})</span>
                    </div>
                  )}
                </div>
                {/* Actions */}
                <div className="sc-card-actions">
                  <button className="sc-action-btn edit" title="Editar"
                    onClick={() => { setEditing(p); setModalOpen(true); }}>
                    <Edit2 size={14} /> Editar
                  </button>
                  <button className={`sc-action-btn toggle ${p.status === 'ACTIVE' ? 'hide' : 'show'}`}
                    title={p.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                    onClick={() => handleToggleStatus(p)}>
                    {p.status === 'ACTIVE' ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button className="sc-action-btn delete" title="Eliminar"
                    onClick={() => handleDelete(p.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── List View ── */}
      {!loading && products.length > 0 && view === 'list' && (
        <div className="sc-list-table">
          <div className="sc-list-header-row">
            <span>Producto</span><span>Tipo</span><span>Precio</span><span>MOQ</span><span>Stock</span><span>Estado</span><span>Acciones</span>
          </div>
          {products.map(p => {
            const sc = STATUS_COLORS[p.status] || STATUS_COLORS.INACTIVE;
            const img = primaryImage(p);
            return (
              <div key={p.id} className="sc-list-row">
                <div className="sc-list-product">
                  <div className="sc-list-thumb">{img ? <img src={img} alt="" /> : <Package size={16} />}</div>
                  <div>
                    <div className="sc-list-name">{p.name}</div>
                    <div className="sc-list-cat">{p.category} {p.brand && `· ${p.brand}`}</div>
                  </div>
                </div>
                <span className="sc-list-type">{SALE_TYPE_LABEL[p.saleType]}</span>
                <span className="sc-list-price">{fmt(p.price)}</span>
                <span className="sc-list-moq">{p.moq?.toLocaleString()} {p.unit}</span>
                <span className="sc-list-stock">{p.stock?.toLocaleString()}</span>
                <span className="sc-list-badge" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                <div className="sc-list-actions">
                  <button onClick={() => { setEditing(p); setModalOpen(true); }}><Edit2 size={14} /></button>
                  <button onClick={() => handleToggleStatus(p)}>
                    {p.status === 'ACTIVE' ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button className="danger" onClick={() => handleDelete(p.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Full-page Product Form ── */}
      {modalOpen && (
        <ProductFormPage
          initial={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
