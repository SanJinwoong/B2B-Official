import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ShoppingCart, Heart, Star, Package, X, Clock, ChevronLeft, ChevronRight, ShoppingBag, Store, Factory, Utensils, Scissors, Truck, FlaskConical, Zap, Hammer, ClipboardList, Trophy, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { marketplaceApi } from '../../../api/api';
import './marketplace.css';

export function triggerCartAnimation(btnRect) {
  const target = document.getElementById('global-cart-btn');
  if (!target || !btnRect) return;
  const targetRect = target.getBoundingClientRect();
  const startX = btnRect.left + btnRect.width / 2;
  const startY = btnRect.top + btnRect.height / 2;
  const endX = targetRect.left + targetRect.width / 2;
  const endY = targetRect.top + targetRect.height / 2;
  const particle = document.createElement('div');
  particle.innerText = '+1';
  particle.className = 'cart-fly-particle';
  particle.style.left = `${startX}px`;
  particle.style.top = `${startY}px`;
  document.body.appendChild(particle);
  particle.getBoundingClientRect(); // reflow
  particle.style.transform = `translate(${endX - startX}px, ${endY - startY}px) scale(0.5)`;
  particle.style.opacity = '0';
  setTimeout(() => {
    particle.remove();
    window.dispatchEvent(new CustomEvent('cart-bounce'));
  }, 600);
}

const CATEGORIES = [
  { id: 'all',          label: 'Todos los productos', icon: <Store size={18} /> },
  { id: 'favorites',    label: 'Mis Favoritos',       icon: <Heart size={18} /> },
  { id: 'empaques',     label: 'Empaques y Envases',  icon: <Package size={18} /> },
  { id: 'manufactura',  label: 'Manufactura Industrial', icon: <Factory size={18} /> },
  { id: 'alimentos',    label: 'Alimentos y Bebidas',  icon: <Utensils size={18} /> },
  { id: 'textiles',     label: 'Textiles y Confección', icon: <Scissors size={18} /> },
  { id: 'logistica',    label: 'Logística',            icon: <Truck size={18} /> },
  { id: 'quimicos',     label: 'Químicos',             icon: <FlaskConical size={18} /> },
  { id: 'electronica',  label: 'Electrónica',          icon: <Zap size={18} /> },
  { id: 'construccion', label: 'Construcción',         icon: <Hammer size={18} /> },
  { id: 'otros',        label: 'Otros',                icon: <ClipboardList size={18} /> },
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
            onClick={e => { e.stopPropagation(); onAddCart(e, product); }}>
            <ShoppingCart size={16}/> Añadir al carrito
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
  const [addedId, setAddedId]     = useState(null);
  const debounce = useRef(null);
  
  // Hero Carousel State
  const [heroImages, setHeroImages] = useState([]);
  const [activeHero, setActiveHero] = useState(0);

  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      if (category === 'favorites') {
        const r = await marketplaceApi.getWishlist();
        let fetchedProducts = (r.data.data || []).map(i => i.product);
        if (search) {
          const s = search.toLowerCase();
          fetchedProducts = fetchedProducts.filter(p => p.name.toLowerCase().includes(s) || p.category?.toLowerCase().includes(s) || p.supplierName?.toLowerCase().includes(s));
        }
        if (saleType !== 'all') {
          fetchedProducts = fetchedProducts.filter(p => p.saleType === saleType || p.saleType === 'BOTH');
        }
        if (sortBy === 'price_asc') fetchedProducts.sort((a,b) => a.price - b.price);
        if (sortBy === 'price_desc') fetchedProducts.sort((a,b) => b.price - a.price);
        if (sortBy === 'rating') fetchedProducts.sort((a,b) => (b.avgRating || 0) - (a.avgRating || 0));

        setProducts(fetchedProducts);
        setPagination({ total: fetchedProducts.length, page: 1, pages: 1 });
        setHeroImages(['https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=2000']);
      } else {
        const params = { page, limit: 12, sortBy };
        if (search)             params.search   = search;
        if (category !== 'all') params.category = category;
        if (saleType !== 'all') params.saleType = saleType;
        const r = await marketplaceApi.search(params);
        const fetchedProducts = r.data.products || [];
        setProducts(fetchedProducts);
        setPagination(r.data.pagination || { total: 0, page: 1, pages: 1 });
        
        // Setup hero images from top-rated products
        const imgs = fetchedProducts
          .sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0))
          .map(p => p.images?.find(i => i.isPrimary)?.url || p.images?.[0]?.url)
          .filter(url => !!url);
          
        if (imgs.length > 0) {
          setHeroImages(imgs.slice(0, 5));
        } else {
          setHeroImages(['https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=2000']);
        }
      }
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
  }, []);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const interval = setInterval(() => {
      setActiveHero(curr => (curr + 1) % heroImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [heroImages]);

  const handleAddCart = async (e, prod) => {
    const btnRect = e.currentTarget.getBoundingClientRect();
    try {
      await marketplaceApi.addToCart(prod.id, prod.moq || 1);
      triggerCartAnimation(btnRect);
      setAddedId(prod.id);
      setTimeout(() => setAddedId(null), 3000);
    } catch(err) {
      alert(err.response?.data?.message || 'Error al agregar al carrito.');
    }
  };

  const handleToggleWishlist = async (productId) => {
    try {
      const r = await marketplaceApi.toggleWishlist(productId);
      const isNowInWishlist = r.data.data.inWishlist;
      setWishlist(prev => {
        const next = new Set(prev);
        isNowInWishlist ? next.add(productId) : next.delete(productId);
        return next;
      });
      if (category === 'favorites' && !isNowInWishlist) {
        setProducts(prev => {
          const updated = prev.filter(p => p.id !== productId);
          setPagination(curr => ({ ...curr, total: updated.length }));
          return updated;
        });
      }
    } catch(e) { console.error(e); }
  };

  const currentCategory = CATEGORIES.find(c => c.id === category);

  return (
    <div className="mk2-shell">

      {/* ── Hero search bar ── */}
      <div className="mk2-hero">
        <div className="mk2-hero-bgs">
          {heroImages.map((img, i) => (
            <div 
              key={i} 
              className={`mk2-hero-bg ${i === activeHero ? 'active' : ''}`}
              style={{ backgroundImage: `url(${img})` }}
            />
          ))}
          <div className="mk2-hero-overlay" />
        </div>
        
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
        <div className="mk2-cart-fab" onClick={() => window.dispatchEvent(new CustomEvent('open-cart'))}>
          <ShoppingCart size={20} />
          <span>Ver Carrito</span>
        </div>
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
          <div className={`mk2-sidebar-badge ${sortBy === 'bestseller' ? 'active' : ''}`} onClick={() => setSortBy('bestseller')}>
            <Trophy size={28} strokeWidth={1.5} className="mk2-sidebar-badge-icon" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Más vendidos</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ver los más populares</div>
            </div>
          </div>
          <div className={`mk2-sidebar-badge ${sortBy === 'newest' ? 'active' : ''}`} style={{ marginTop: 8 }} onClick={() => setSortBy('newest')}>
            <Sparkles size={28} strokeWidth={1.5} className="mk2-sidebar-badge-icon" />
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
          <ShoppingCart size={18}/> Producto añadido al carrito
        </div>
      )}
    </div>
  );
}
