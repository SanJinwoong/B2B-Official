import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, Heart, Package, ArrowLeft, ChevronUp, ChevronDown, CheckCircle, Clock, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { marketplaceApi } from '../../../api/api';
import { useAuth } from '../../../context/AuthContext';
import { triggerCartAnimation } from './MarketplacePage';
import './ProductDetailPage.css';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

function StarRating({ value = 0, count = 0, interactive = false, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {[1,2,3,4,5].map(i => {
        const filled = interactive ? (hover || value) >= i : value >= i;
        return (
          <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={filled ? '#fbbf24' : 'none'} stroke={filled ? '#fbbf24' : '#cbd5e1'} strokeWidth="2"
            style={{ cursor: interactive ? 'pointer' : 'default', transition: 'all 0.15s' }}
            onMouseEnter={() => interactive && setHover(i)}
            onMouseLeave={() => interactive && setHover(0)}
            onClick={() => interactive && onChange?.(i)}
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        );
      })}
      {!interactive && count > 0 && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: 4 }}>({count} Reseñas)</span>}
    </span>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSupplier = user?.role === 'SUPPLIER';
  
  const [product, setProduct] = useState(null);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  
  const [inWishlist, setInWishlist] = useState(false);
  const [addingCart, setAddingCart] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);
  
  const [filterStars, setFilterStars] = useState(null);
  const [selectedReviewImage, setSelectedReviewImage] = useState(null);
  
  // Accordions
  const [openDesc, setOpenDesc] = useState(true);
  const [openSpecs, setOpenSpecs] = useState(false);

  useEffect(() => {
    setLoading(true);
    marketplaceApi.getProduct(id)
      .then(r => {
        const p = r.data.data;
        setProduct(p);
        setInWishlist(p.inWishlist || false);
        setQty(p.moq || 1);
        
        // Fetch more items for "You might also like"
        marketplaceApi.search({ limit: 8, category: p.category }).then(res => {
          const others = res.data.data.filter(x => x.id !== p.id);
          // If we still don't have enough, fetch without category filter to ensure 4+ items
          if (others.length < 4) {
            marketplaceApi.search({ limit: 12 }).then(res2 => {
              const more = res2.data.data.filter(x => x.id !== p.id);
              setRecommended(more.slice(0, 4));
            }).catch(() => {});
          } else {
            setRecommended(others.slice(0, 4));
          }
        }).catch(() => {});
      })
      .catch(() => navigate('/client/marketplace'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      Cargando producto...
    </div>
  );

  if (!product) return null;

  const images = product.images?.length > 0 ? product.images : null;
  const primaryImg = images ? (images[activeImg]?.url || images[0]?.url) : null;
  const tierPricing = product.tierPricing || [];
  const specs = product.specs || {};
  const tags = product.tags || [];

  const effectivePrice = (() => {
    if (!tierPricing.length) return product.price;
    const match = [...tierPricing].sort((a, b) => b.minQty - a.minQty).find(t => qty >= t.minQty);
    return match ? match.price : product.price;
  })();

  const ratingsList = filterStars ? product.ratings?.filter(r => Math.round(r.stars) === filterStars) : (product.ratings || []);

  const handleAddCart = async (e) => {
    const btnRect = e.currentTarget.getBoundingClientRect();
    setAddingCart(true);
    try {
      await marketplaceApi.addToCart(product.id, qty);
      triggerCartAnimation(btnRect);
      setCartSuccess(true);
      setTimeout(() => setCartSuccess(false), 3000);
    } catch(e) {
      alert(e.response?.data?.message || 'Error al agregar.');
    } finally { setAddingCart(false); }
  };

  const handleWishlist = async () => {
    try {
      const r = await marketplaceApi.toggleWishlist(product.id);
      setInWishlist(r.data.data.inWishlist);
    } catch(e) { console.error(e); }
  };

  return (
    <div className="pdp-wrapper">
      {/* ── BREADCRUMB ── */}
      <div className="pdp-breadcrumb">
        <Link to={isSupplier ? "/proveedor/catalogo" : "/client/marketplace"}>Home</Link>
        <span>/</span>
        <Link to={isSupplier ? "/proveedor/catalogo" : "/client/marketplace"}>{product.category}</Link>
        <span>/</span>
        <span className="current">{product.name}</span>
      </div>

      <div className="pdp-main">
        {/* ── LEFT: IMAGES ── */}
        <div className="pdp-gallery">
          <div className="pdp-img-main" style={{ position: 'relative' }}>
            {primaryImg 
              ? <img src={primaryImg} alt={product.name} /> 
              : <Package size={100} color="#cbd5e1" strokeWidth={1} />
            }
            {images && images.length > 1 && (
              <>
                <button 
                  className="pdp-gallery-arrow left"
                  onClick={() => setActiveImg(prev => (prev === 0 ? images.length - 1 : prev - 1))}
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  className="pdp-gallery-arrow right"
                  onClick={() => setActiveImg(prev => (prev === images.length - 1 ? 0 : prev + 1))}
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>
          {images && images.length > 1 && (
            <div className="pdp-img-thumbs">
              {images.map((img, i) => (
                <button key={i} className={`pdp-thumb ${activeImg === i ? 'active' : ''}`} onClick={() => setActiveImg(i)}>
                  <img src={img.url} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: INFO & ACTIONS ── */}
        <div className="pdp-info">
          <div className="pdp-brand-tag">{product.supplierName}</div>
          <h1 className="pdp-title">{product.name}</h1>
          <div className="pdp-price">
            {fmt(effectivePrice)} <span>/{product.unit}</span>
          </div>
          
          <div style={{ marginBottom: 32 }}>
            <StarRating value={product.avgRating} count={product.ratingCount} />
          </div>

          {/* Tier Pricing */}
          {tierPricing.length > 0 && (
            <div className="pdp-tiers">
              <div className="pdp-tier-title">Precios por volumen</div>
              <div className={`pdp-tier-row ${qty < tierPricing[0].minQty ? 'active' : ''}`}>
                <span>1 - {tierPricing[0].minQty - 1} {product.unit}</span>
                <span>{fmt(product.price)}</span>
              </div>
              {tierPricing.map((t, i) => (
                <div key={i} className={`pdp-tier-row ${qty >= t.minQty && (i === tierPricing.length - 1 || qty < tierPricing[i+1].minQty) ? 'active' : ''}`}>
                  <span>{t.minQty.toLocaleString()}+ {product.unit}</span>
                  <span>{fmt(t.price)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Controls */}
          {!isSupplier && (
            <div className="pdp-cart-box">
              <div className="pdp-qty-row">
                <span className="pdp-qty-label">Cantidad ({product.unit})</span>
                <div className="pdp-qty-ctrl">
                  <button onClick={() => setQty(q => Math.max(product.moq || 1, q - 1))}>−</button>
                  <input type="number" value={qty} onChange={e => setQty(Math.max(product.moq || 1, Number(e.target.value)))} />
                  <button onClick={() => setQty(q => q + 1)}>+</button>
                </div>
              </div>

              <div className="pdp-actions">
                <button 
                  className={`pdp-btn-cart ${cartSuccess ? 'success' : ''}`}
                  onClick={handleAddCart}
                  disabled={addingCart}
                >  {cartSuccess ? <CheckCircle size={20} /> : <ShoppingCart size={20} />}
                  {cartSuccess ? 'Agregado' : addingCart ? 'Procesando...' : 'Añadir al carrito'}
                </button>
                <button className={`pdp-btn-wish ${inWishlist ? 'active' : ''}`} onClick={handleWishlist}>
                  <Heart size={20} fill={inWishlist ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
          )}

          {/* Accordeons */}
          <div className="pdp-accordion">
            <button className="pdp-accordion-header" onClick={() => setOpenDesc(!openDesc)}>
              Descripción del producto
              {openDesc ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
            </button>
            {openDesc && (
              <div className="pdp-accordion-body">
                {product.description || 'Sin descripción detallada.'}
                
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={16} color="var(--text-muted)"/> Entrega estimada: {product.leadTimeDays} días</div>
                  {product.moq > 1 && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Package size={16} color="var(--text-muted)"/> MOQ: {product.moq} {product.unit}</div>}
                </div>
              </div>
            )}
          </div>

          <div className="pdp-accordion">
            <button className="pdp-accordion-header" onClick={() => setOpenSpecs(!openSpecs)}>
              Especificaciones Técnicas
              {openSpecs ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
            </button>
            {openSpecs && (
              <div className="pdp-accordion-body">
                {Object.keys(specs).length > 0 ? (
                  <table className="pdp-spec-table">
                    <tbody>
                      {Object.entries(specs).filter(([k]) => !k.startsWith('_')).map(([k,v]) => (
                        <tr key={k}><th>{k}</th><td>{v}</td></tr>
                      ))}
                    </tbody>
                  </table>
                ) : 'No hay especificaciones adicionales.'}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── RATINGS & REVIEWS ── */}
      <div className="pdp-reviews-section">
        <h2 className="pdp-reviews-title">Rating & Reviews</h2>
        <div className="pdp-reviews-grid">
          
          {/* LEFT COLUMN: Overview & Form */}
          <div className="pdp-rating-overview">
            <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
              <div>
                <div className="pdp-rating-big">
                  {product.avgRating > 0 ? product.avgRating.toFixed(1).replace('.', ',') : '0,0'}
                  <span>/5</span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                  ({product.ratingCount} Reseñas)
                </div>
              </div>
              
              <div className="pdp-rating-bars">
                {[5,4,3,2,1].map(star => {
                  const count = product.ratings?.filter(r => Math.round(r.stars) === star).length || 0;
                  const pct = product.ratingCount > 0 ? (count / product.ratingCount) * 100 : 0;
                  return (
                    <div 
                      key={star} 
                      className="pdp-bar-row" 
                      style={{ cursor: 'pointer', opacity: filterStars && filterStars !== star ? 0.5 : 1, transition: 'opacity 0.2s' }}
                      onClick={() => setFilterStars(prev => prev === star ? null : star)}
                    >
                      <StarRating value={1} count={0} />
                      <span style={{ width: 12, fontSize: '0.8rem', fontWeight: 600 }}>{star}</span>
                      <div className="pdp-bar-bg">
                        <div className="pdp-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </div>

          {/* RIGHT COLUMN: Review List */}
          <div className="pdp-review-list">
            {filterStars && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Filtrado por:</span>
                <button 
                  onClick={() => setFilterStars(null)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '4px 12px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text)', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
                >
                  <StarRating value={1} count={0} /> {filterStars}
                  <XCircle size={14} color="var(--text-muted)" style={{ marginLeft: 4 }} />
                </button>
              </div>
            )}
            {ratingsList.length > 0 && ratingsList.map(r => {
                let parsedImages = [];
                try { parsedImages = typeof r.images === 'string' ? JSON.parse(r.images) : (r.images || []); } catch(e){}
                return (
                  <div key={r.id} className="pdp-review-card">
                    <div className="pdp-review-header">
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(r.user?.name || 'Cliente')}&background=random`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 2 }}>{r.user?.name || 'Cliente Verificado'}</div>
                          <StarRating value={r.stars} />
                        </div>
                      </div>
                      <div className="pdp-review-date">{new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                    {r.comment && <div className="pdp-review-text">"{r.comment}"</div>}
                    
                    {parsedImages.length > 0 && (
                      <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                        {parsedImages.map((imgBase64, idx) => (
                          <img 
                            key={idx} 
                            src={imgBase64} 
                            alt="Review attachment" 
                            style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', transition: 'transform 0.2s' }} 
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            onClick={() => setSelectedReviewImage({ url: imgBase64, review: r })}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            {ratingsList.length === 0 && (
              <div style={{ color: 'var(--text-muted)', paddingTop: '20px' }}>Aún no hay reseñas para este producto.</div>
            )}
          </div>
        </div>
      </div>

      {/* ── RELATED PRODUCTS ── */}
      {!isSupplier && recommended.length > 0 && (
        <div className="pdp-related-section">
          <h2 className="pdp-related-title">You might also like</h2>
          <div className="pdp-related-grid">
            {recommended.map(p => {
              const img = p.images?.find(i => i.isPrimary)?.url || p.images?.[0]?.url;
              return (
                <Link key={p.id} to={`/client/marketplace/${p.id}`} className="pdp-rel-card">
                  <div className="pdp-rel-img">
                    {img ? <img src={img} alt={p.name}/> : <Package size={40} color="#cbd5e1" strokeWidth={1}/>}
                  </div>
                  <div className="pdp-rel-title">{p.name}</div>
                  <StarRating value={p.avgRating} count={p.ratingCount} />
                  <div className="pdp-rel-price">{fmt(p.price)}</div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
      {selectedReviewImage && (
        <div className="cd-modal-overlay" onClick={() => setSelectedReviewImage(null)} style={{ display: 'flex', padding: '24px', zIndex: 9999 }}>
          <div 
            className="cd-modal" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: 900, width: '100%', display: 'flex', flexDirection: 'row', overflow: 'hidden', background: '#fff', borderRadius: 12, height: '80vh' }}
          >
            {/* Left side: Image */}
            <div style={{ flex: 2, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <img src={selectedReviewImage.url} alt="Review full" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              <button 
                onClick={() => setSelectedReviewImage(null)}
                style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <XCircle size={24} />
              </button>
            </div>
            {/* Right side: Details */}
            <div style={{ flex: 1, padding: 32, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedReviewImage.review.user?.name || 'Cliente')}&background=random`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>{selectedReviewImage.review.user?.name || 'Cliente Verificado'}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(selectedReviewImage.review.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
              </div>
              <div>
                <StarRating value={selectedReviewImage.review.stars} />
              </div>
              {selectedReviewImage.review.comment && (
                <div style={{ fontSize: '1rem', lineHeight: 1.5, color: 'var(--text)' }}>
                  "{selectedReviewImage.review.comment}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
