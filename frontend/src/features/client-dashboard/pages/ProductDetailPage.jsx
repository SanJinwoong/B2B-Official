import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, Heart, Star, Package, ArrowLeft, CheckCircle, Clock, TrendingUp, ChevronRight, X } from 'lucide-react';
import { marketplaceApi } from '../../../api/api';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
const SALE_LABEL = { WHOLESALE: 'Mayoreo', RETAIL: 'Menudeo', BOTH: 'Mayoreo y Menudeo' };

function StarRating({ value = 0, count = 0, interactive = false, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <span className="mk-stars">
      {[1,2,3,4,5].map(i => (
        <Star key={i}
          size={interactive ? 22 : 14}
          fill={(hover || value) >= i ? '#fbbf24' : 'none'}
          color={(hover || value) >= i ? '#fbbf24' : '#cbd5e1'}
          strokeWidth={1.5}
          style={{ cursor: interactive ? 'pointer' : 'default' }}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onChange && onChange(i)}
        />
      ))}
      {!interactive && value > 0 && <span className="mk-stars-val">{value.toFixed(1)}</span>}
      {!interactive && count > 0 && <span className="mk-stars-count">({count} reseñas)</span>}
    </span>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty]             = useState(1);
  const [tab, setTab]             = useState('descripcion');
  const [inWishlist, setInWishlist] = useState(false);
  const [addingCart, setAddingCart] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    setLoading(true);
    marketplaceApi.getProduct(id)
      .then(r => {
        const p = r.data.data;
        setProduct(p);
        setInWishlist(p.inWishlist || false);
        setQty(p.moq || 1);
      })
      .catch(() => navigate('/client/marketplace'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, color: 'var(--text-muted)' }}>
      <div className="sc-spinner" /> <span style={{ marginLeft: 12 }}>Cargando producto...</span>
    </div>
  );

  if (!product) return null;

  const images = product.images?.length > 0 ? product.images : null;
  const primaryImg = images ? (images[activeImg]?.url || images[0]?.url) : null;
  const tierPricing = product.tierPricing || [];
  const specs = product.specs || {};
  const tags = product.tags || [];

  // Calcular precio según cantidad (tier pricing)
  const effectivePrice = (() => {
    if (!tierPricing.length) return product.price;
    const match = [...tierPricing].sort((a, b) => b.minQty - a.minQty).find(t => qty >= t.minQty);
    return match ? match.price : product.price;
  })();

  const subtotal = effectivePrice * qty;
  const savings  = product.price !== effectivePrice ? (product.price - effectivePrice) * qty : 0;

  const handleAddCart = async () => {
    setAddingCart(true);
    try {
      await marketplaceApi.addToCart(product.id, qty);
      setCartSuccess(true);
      setTimeout(() => setCartSuccess(false), 3000);
    } catch(e) {
      alert(e.response?.data?.message || 'Error al agregar al carrito.');
    } finally { setAddingCart(false); }
  };

  const handleWishlist = async () => {
    try {
      const r = await marketplaceApi.toggleWishlist(product.id);
      setInWishlist(r.data.data.inWishlist);
    } catch(e) { console.error(e); }
  };

  const handleRating = async () => {
    if (!ratingStars) { alert('Selecciona una calificación.'); return; }
    setSubmittingRating(true);
    try {
      await marketplaceApi.submitRating(product.id, { stars: ratingStars, comment: ratingComment });
      alert('¡Gracias por tu reseña!');
      setRatingStars(0); setRatingComment('');
    } catch(e) {
      alert(e.response?.data?.message || 'Error al enviar reseña.');
    } finally { setSubmittingRating(false); }
  };

  return (
    <div className="pd-shell">
      {/* Breadcrumb */}
      <div className="pd-breadcrumb">
        <button onClick={() => navigate('/client/marketplace')} className="pd-back">
          <ArrowLeft size={15}/> Marketplace
        </button>
        <ChevronRight size={13} />
        <span>{product.category}</span>
        <ChevronRight size={13} />
        <span className="pd-breadcrumb-current">{product.name}</span>
      </div>

      {/* Main layout */}
      <div className="pd-layout">
        {/* ── LEFT: Gallery ── */}
        <div className="pd-gallery">
          <div className="pd-main-img">
            {primaryImg
              ? <img src={primaryImg} alt={product.name} />
              : <div className="pd-img-placeholder"><Package size={64} strokeWidth={1}/></div>
            }
            {product.salesCount > 50 && (
              <div className="pd-img-badge-top"><TrendingUp size={12}/> Más vendido</div>
            )}
          </div>
          {images && images.length > 1 && (
            <div className="pd-thumbs">
              {images.map((img, i) => (
                <button key={i} className={`pd-thumb${activeImg === i ? ' active' : ''}`}
                  onClick={() => setActiveImg(i)}>
                  <img src={img.url} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── CENTER: Info ── */}
        <div className="pd-info">
          <div className="pd-supplier-row">
            <span className="pd-supplier-name">{product.supplierName}</span>
            {product.supplierLocation && <span className="pd-supplier-loc">📍 {product.supplierLocation}</span>}
          </div>
          <h1 className="pd-name">{product.name}</h1>
          {product.brand && <div className="pd-brand">Marca: <strong>{product.brand}</strong></div>}
          {product.sku && <div className="pd-sku">SKU: {product.sku}</div>}

          <div className="pd-rating-row">
            <StarRating value={product.avgRating} count={product.ratingCount} />
          </div>

          <div className="pd-tags-row">
            <span className="pd-tag-type">{SALE_LABEL[product.saleType]}</span>
            {tags.map(t => <span key={t} className="pd-tag">{t}</span>)}
          </div>

          {/* Precios escalonados */}
          {tierPricing.length > 0 && (
            <div className="pd-tier-table">
              <div className="pd-tier-header">Precios por volumen</div>
              <div className="pd-tier-rows">
                <div className="pd-tier-row base">
                  <span>1 – {tierPricing[0]?.minQty - 1} {product.unit}</span>
                  <span>{fmt(product.price)}/{product.unit}</span>
                </div>
                {tierPricing.map((t, i) => (
                  <div key={i} className={`pd-tier-row${qty >= t.minQty ? ' active-tier' : ''}`}>
                    <span>{t.minQty.toLocaleString()}+ {product.unit}</span>
                    <span>{fmt(t.price)}/{product.unit}</span>
                    {i === tierPricing.length - 1 && <span className="pd-tier-best">Mejor precio</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key specs */}
          <div className="pd-key-specs">
            <div className="pd-key-spec"><Clock size={14}/><span>Entrega en {product.leadTimeDays} días</span></div>
            {product.moq > 1 && <div className="pd-key-spec"><Package size={14}/><span>MOQ: {product.moq.toLocaleString()} {product.unit}</span></div>}
            <div className="pd-key-spec"><CheckCircle size={14}/><span>Stock: {product.stock.toLocaleString()} {product.unit}</span></div>
          </div>

          {/* Tabs */}
          <div className="pd-tabs">
            {[['descripcion','Descripción'],['specs','Especificaciones'],['ratings','Reseñas']].map(([k,l]) => (
              <button key={k} className={`pd-tab${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
          <div className="pd-tab-content">
            {tab === 'descripcion' && (
              <p className="pd-description">{product.description || 'Sin descripción disponible.'}</p>
            )}
            {tab === 'specs' && (
              Object.keys(specs).length > 0
                ? <table className="pd-specs-table">
                    <tbody>
                      {Object.entries(specs).map(([k,v]) => (
                        <tr key={k}><th>{k}</th><td>{v}</td></tr>
                      ))}
                    </tbody>
                  </table>
                : <p className="pd-description" style={{ color: 'var(--text-muted)' }}>Sin especificaciones detalladas.</p>
            )}
            {tab === 'ratings' && (
              <div>
                {product.ratings?.map(r => (
                  <div key={r.id} className="pd-review">
                    <div className="pd-review-header">
                      <StarRating value={r.stars} />
                      {r.verified && <span className="pd-review-verified"><CheckCircle size={12}/> Compra verificada</span>}
                      <span className="pd-review-date">{new Date(r.createdAt).toLocaleDateString('es-MX')}</span>
                    </div>
                    {r.comment && <p className="pd-review-comment">{r.comment}</p>}
                  </div>
                ))}
                {product.ratings?.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aún no hay reseñas.</p>}
                {/* Rate form */}
                <div className="pd-rate-form">
                  <div className="pd-rate-title">Califica este producto</div>
                  <StarRating interactive value={ratingStars} onChange={setRatingStars} />
                  <textarea className="pd-rate-textarea" rows={3} placeholder="Escribe tu reseña (opcional)..."
                    value={ratingComment} onChange={e => setRatingComment(e.target.value)} />
                  <button className="mk-btn-primary pd-rate-submit" onClick={handleRating} disabled={submittingRating}>
                    {submittingRating ? 'Enviando...' : 'Publicar reseña'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Purchase panel ── */}
        <div className="pd-panel">
          <div className="pd-panel-price">{fmt(effectivePrice)}<span>/{product.unit}</span></div>
          {savings > 0 && (
            <div className="pd-panel-savings">
              Ahorras {fmt(savings)} con esta cantidad
            </div>
          )}

          {/* Quantity */}
          <div className="pd-panel-qty-label">Cantidad ({product.unit})</div>
          <div className="pd-panel-qty">
            <button onClick={() => setQty(q => Math.max(product.moq || 1, q - (product.moq || 1)))}>−</button>
            <input type="number" value={qty} min={product.moq || 1}
              onChange={e => setQty(Math.max(product.moq || 1, Number(e.target.value)))} />
            <button onClick={() => setQty(q => q + (product.moq || 1))}>+</button>
          </div>
          {product.moq > 1 && <div className="pd-panel-moq-hint">Mínimo {product.moq.toLocaleString()} {product.unit}</div>}

          {/* Subtotal */}
          <div className="pd-panel-subtotal">
            <span>Subtotal</span>
            <strong>{fmt(subtotal)}</strong>
          </div>

          {cartSuccess && (
            <div className="pd-cart-success"><CheckCircle size={14}/> ¡Agregado al carrito!</div>
          )}

          <button className="pd-btn-cart" onClick={handleAddCart} disabled={addingCart || product.stock === 0}>
            <ShoppingCart size={16}/>
            {addingCart ? 'Agregando...' : 'Agregar al carrito'}
          </button>

          <button className={`pd-btn-wish${inWishlist ? ' active' : ''}`} onClick={handleWishlist}>
            <Heart size={16} fill={inWishlist ? 'currentColor' : 'none'}/>
            {inWishlist ? 'Guardado' : 'Guardar para después'}
          </button>

          <Link to={`/client/rfqs`} className="pd-btn-rfq">
            Solicitar cotización personalizada →
          </Link>

          {/* Supplier mini card */}
          <div className="pd-supplier-card">
            <div className="pd-supplier-title">Proveedor</div>
            <div className="pd-supplier-cname">{product.supplierName}</div>
            {product.supplierLocation && <div className="pd-supplier-cloc">📍 {product.supplierLocation}</div>}
            <div className="pd-supplier-stats">
              <span><TrendingUp size={12}/> {product.salesCount} ventas</span>
              <span><Star size={12} fill="#fbbf24" color="#fbbf24"/> {product.avgRating > 0 ? product.avgRating.toFixed(1) : 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related products */}
      {product.related?.length > 0 && (
        <div className="pd-related">
          <h2 className="pd-related-title">Más productos de esta categoría</h2>
          <div className="pd-related-grid">
            {product.related.map(p => {
              const img = p.images?.find(i => i.isPrimary)?.url || p.images?.[0]?.url;
              return (
                <Link key={p.id} to={`/client/marketplace/${p.id}`} className="pd-related-card">
                  <div className="pd-related-img">
                    {img ? <img src={img} alt={p.name}/> : <Package size={24} strokeWidth={1}/>}
                  </div>
                  <div className="pd-related-name">{p.name}</div>
                  <div className="pd-related-price">{fmt(p.price)}/{p.unit}</div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
