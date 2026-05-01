import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ShoppingCart, Heart, Star, Package, X, Clock, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { marketplaceApi } from '../../../api/api';
import CartDrawer from '../components/CartDrawer';
import './marketplace.css';

const CATEGORIES = [
  { id: 'all',          label: 'Todos los productos', icon: '🏪', count: null },
  { id: 'empaques',     label: 'Empaques y Envases',  icon: '📦' },
  { id: 'manufactura',  label: 'Manufactura Industrial', icon: '🏭' },
  { id: 'alimentos',    label: 'Alimentos y Bebidas',  icon: '🍽️' },
  { id: 'textiles',     label: 'Textiles',             icon: '🧵' },
  { id: 'logistica',    label: 'Logística',            icon: '🚚' },
  { id: 'quimicos',     label: 'Químicos',             icon: '🧪' },
  { id: 'electronica',  label: 'Electrónica',          icon: '⚡' },
  { id: 'construccion', label: 'Construcción',         icon: '🏗️' },
  { id: 'otros',        label: 'Otros',                icon: '📋' },
];

const SORT_OPTIONS = [
  { id: 'newest',     label: 'Más recientes' },
  { id: 'bestseller', label: 'Más vendidos'  },
  { id: 'rating',     label: 'Mejor calificados' },
  { id: 'price_asc',  label: 'Precio ↑' },
  { id: 'price_desc', label: 'Precio ↓' },
];

const SALE_LABEL = { WHOLESALE: 'Mayoreo', RETAIL: 'Menudeo', BOTH: 'Ambos' };
const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

function Stars({ v = 0, count }) {
  return (
    <div className="mk2-stars">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={12}
          fill={i <= Math.round(v) ? '#f59e0b' : 'none'}
          color={i <= Math.round(v) ? '#f59e0b' : '#d1d5db'}
          strokeWidth={1.5} />
      ))}
      <span className="mk2-stars-val">{v > 0 ? v.toFixed(1) : '—'}</span>
      {count > 0 && <span className="mk2-stars-count">({count})</span>}
    </div>
  );
}

function ProductCard({ product, inWishlist, onAddCart, onToggleWishlist }) {
  const navigate = useNavigate();
  const img = product.images?.find(i => i.isPrimary)?.url || product.images?.[0]?.url;

  return (
    <div className="mk2-card">
      {/* Category badge */}
      <div className="mk2-card-cat-badge">{SALE_LABEL[product.saleType]}</div>

      {/* Wishlist button */}
      <button
        className={`mk2-card-wish${inWishlist ? ' active' : ''}`}
        onClick={e => { e.stopPropagation(); onToggleWishlist(product.id); }}>
        <Heart size={15} fill={inWishlist ? 'currentColor' : 'none'} />
      </button>

      {/* Image */}
      <div className="mk2-card-img" onClick={() => navigate(`/client/marketplace/${product.id}`)}>
        {img
          ? <img src={img} alt={product.name} />
          : <div className="mk2-card-img-placeholder"><Package size={40} strokeWidth={1} /></div>
        }
      </div>

      {/* Body */}
      <div className="mk2-card-body">
        <div className="mk2-card-supplier">{product.supplierName}</div>
        <div className="mk2-card-name" onClick={() => navigate(`/client/marketplace/${product.id}`)}>
          {product.name}
        </div>
        <Stars v={product.avgRating} count={product.ratingCount} />

        {/* Price */}
        <div className="mk2-card-price-row">
          <span className="mk2-card-price">{fmt(product.price)}</span>
          <span className="mk2-card-unit">/{product.unit}</span>
        </div>
        {product.moq > 1 && (
          <div className="mk2-card-moq">MOQ: {product.moq.toLocaleString()} {product.unit}</div>
        )}
        {product.tierPricing?.length > 0 && (
          <div className="mk2-card-discount-hint">
            ↓ Descuento por volumen disponible
          </div>
        )}

        {/* Actions */}
        <div className="mk2-card-actions">
          <button className="mk2-btn-addcart"
            onClick={e => { e.stopPropagation(); onAddCart(product); }}>
            <ShoppingCart size={14}/> Añadir al carrito
          </button>
          <button className="mk2-btn-buynow"
            onClick={() => navigate(`/client/marketplace/${product.id}`)}>
            Ver detalle
          </button>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="mk2-skeleton-card">
      <div className="mk2-sk mk2-sk-img" />
      <div className="mk2-sk mk2-sk-line" style={{ width: '60%', marginTop: 12 }} />
      <div className="mk2-sk mk2-sk-line" style={{ width: '90%', marginTop: 8 }} />
      <div className="mk2-sk mk2-sk-line" style={{ width: '40%', marginTop: 8 }} />
      <div className="mk2-sk mk2-sk-btn" style={{ marginTop: 16 }} />
    </div>
  );
}

export default function MarketplacePage() {
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [search, setSearch]       = useState('');
  const [category, setCategory]   = useState('all');
  const [saleType, setSaleType]   = useState('all');
  const [sortBy, setSortBy]       = useState('newest');
  const [wishlist, setWishlist]   = useState(new Set());
  const [cartOpen, setCartOpen]   = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [addedId, setAddedId]     = useState(null);
  const debounce = useRef(null);

  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 12, sortBy };
      if (search)             params.search   = search;
      if (category !== 'all') params.category = category;
      if (saleType !== 'all') params.saleType = saleType;
      const r = await marketplaceApi.search(params);
      setProducts(r.data.products || []);
      setPagination(r.data.pagination || { total: 0, page: 1, pages: 1 });
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, category, saleType, sortBy]);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchProducts(1), 350);
  }, [fetchProducts]);

  useEffect(() => {
    marketplaceApi.getWishlist().then(r => {
      setWishlist(new Set(r.data.data?.map(i => i.product.id)));
    }).catch(() => {});
    marketplaceApi.getCart().then(r => {
      setCartCount(r.data.data?.itemCount || 0);
    }).catch(() => {});
  }, []);

  const handleAddCart = async (product) => {
    try {
      await marketplaceApi.addToCart(product.id, product.moq || 1);
      setCartCount(c => c + 1);
      setAddedId(product.id);
      setTimeout(() => setAddedId(null), 2000);
    } catch(e) {
      alert(e.response?.data?.message || 'Error al agregar al carrito.');
    }
  };

  const handleToggleWishlist = async (productId) => {
    try {
      const r = await marketplaceApi.toggleWishlist(productId);
      setWishlist(prev => {
        const next = new Set(prev);
        r.data.data.inWishlist ? next.add(productId) : next.delete(productId);
        return next;
      });
    } catch(e) { console.error(e); }
  };

  const currentCategory = CATEGORIES.find(c => c.id === category);

  return (
    <div className="mk2-shell">

      {/* ── Hero search bar ── */}
      <div className="mk2-hero">
        <div className="mk2-hero-content">
          <h1 className="mk2-hero-title">Marketplace B2B México</h1>
          <p className="mk2-hero-sub">Conecta con los mejores proveedores industriales</p>
          <div className="mk2-hero-search">
            <Search size={20} className="mk2-hero-search-icon" />
            <input
              className="mk2-hero-search-input"
              placeholder="Buscar productos, proveedores, categorías..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="mk2-hero-search-clear" onClick={() => setSearch('')}><X size={16}/></button>
            )}
            <button className="mk2-hero-search-btn">Buscar</button>
          </div>
        </div>
        {/* Cart button floating */}
        <button className="mk2-cart-fab" onClick={() => setCartOpen(true)}>
          <ShoppingCart size={20} />
          {cartCount > 0 && <span className="mk2-cart-fab-badge">{cartCount}</span>}
        </button>
      </div>

      {/* ── Main layout: sidebar + content ── */}
      <div className="mk2-layout">

        {/* ── Left Sidebar ── */}
        <aside className="mk2-sidebar">
          <div className="mk2-sidebar-title">Categoría</div>
          <nav className="mk2-cat-nav">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`mk2-cat-item${category === cat.id ? ' active' : ''}`}
                onClick={() => setCategory(cat.id)}>
                <span className="mk2-cat-icon">{cat.icon}</span>
                <span className="mk2-cat-name">{cat.label}</span>
                {category === cat.id && <span className="mk2-cat-dot" />}
              </button>
            ))}
          </nav>

          {/* Sale type filter */}
          <div className="mk2-sidebar-title" style={{ marginTop: 24 }}>Tipo de Venta</div>
          <div className="mk2-sale-filters">
            {[['all','Todos'],['WHOLESALE','Mayoreo'],['RETAIL','Menudeo'],['BOTH','Ambos']].map(([k,l]) => (
              <button key={k} className={`mk2-sale-filter${saleType === k ? ' active' : ''}`}
                onClick={() => setSaleType(k)}>{l}</button>
            ))}
          </div>

          {/* Bestsellers badge */}
          <div className="mk2-sidebar-badge">
            <span>🏆</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Más vendidos</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ver los más populares</div>
            </div>
          </div>
          <div className="mk2-sidebar-badge" style={{ marginTop: 8 }}>
            <span>⭐</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Nuevos ingresos</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Esta semana</div>
            </div>
          </div>
        </aside>

        {/* ── Right: Product grid ── */}
        <div className="mk2-content">

          {/* Controls bar */}
          <div className="mk2-controls">
            <div className="mk2-results-label">
              {loading
                ? 'Buscando...'
                : `${pagination.total.toLocaleString()} productos en `}
              {!loading && <strong>{currentCategory?.label}</strong>}
            </div>
            <div className="mk2-sort-row">
              <span className="mk2-sort-label">Ordenar por:</span>
              <select className="mk2-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="mk2-grid">
              {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : products.length === 0 ? (
            <div className="mk2-empty">
              <ShoppingBag size={64} strokeWidth={1} />
              <h3>No se encontraron productos</h3>
              <p>Intenta con otros términos o categorías</p>
              <button className="mk2-btn-reset" onClick={() => { setSearch(''); setCategory('all'); setSaleType('all'); }}>
                Ver todos los productos
              </button>
            </div>
          ) : (
            <div className="mk2-grid">
              {products.map(p => (
                <ProductCard key={p.id} product={p}
                  inWishlist={wishlist.has(p.id)}
                  onAddCart={handleAddCart}
                  onToggleWishlist={handleToggleWishlist}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mk2-pagination">
              <button className="mk2-page-arrow"
                disabled={pagination.page <= 1}
                onClick={() => fetchProducts(pagination.page - 1)}>
                <ChevronLeft size={16}/> Anterior
              </button>
              <div className="mk2-page-nums">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                  .filter(p => Math.abs(p - pagination.page) <= 2)
                  .map(p => (
                    <button key={p}
                      className={`mk2-page-num${p === pagination.page ? ' active' : ''}`}
                      onClick={() => fetchProducts(p)}>{p}</button>
                  ))
                }
              </div>
              <button className="mk2-page-arrow"
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchProducts(pagination.page + 1)}>
                Siguiente <ChevronRight size={16}/>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Added to cart toast ── */}
      {addedId && (
        <div className="mk2-toast">
          <ShoppingCart size={16}/> Producto añadido al carrito
        </div>
      )}

      {/* ── Cart Drawer ── */}
      {cartOpen && (
        <CartDrawer
          onClose={() => setCartOpen(false)}
          onCartChange={count => setCartCount(count)}
        />
      )}
    </div>
  );
}
