import { useState } from 'react';
import { Star, X, Upload, CheckCircle } from 'lucide-react';
import { marketplaceApi } from '../../../api/api';

export default function ReviewModal({ order, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const items = order?.orderItems || [];

  // Almacenar el estado de reseña por cada producto
  // { productId: { stars: 5, comment: '', images: [] } }
  const [reviews, setReviews] = useState(() => {
    const initial = {};
    items.forEach(item => {
      initial[item.productId] = { stars: 5, comment: '', images: [] };
    });
    return initial;
  });

  const handleStarClick = (productId, stars) => {
    setReviews(prev => ({ ...prev, [productId]: { ...prev[productId], stars } }));
  };

  const handleCommentChange = (productId, comment) => {
    setReviews(prev => ({ ...prev, [productId]: { ...prev[productId], comment } }));
  };

  const handleImageUpload = (productId, e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Convert to base64
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result;
        setReviews(prev => ({
          ...prev, 
          [productId]: { 
            ...prev[productId], 
            images: [...prev[productId].images, base64] 
          }
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (productId, index) => {
    setReviews(prev => {
      const copy = { ...prev };
      copy[productId].images = copy[productId].images.filter((_, i) => i !== index);
      return copy;
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      for (const item of items) {
        const rev = reviews[item.productId];
        await marketplaceApi.submitRating(item.productId, rev);
      }
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
      alert('Error al enviar las reseñas.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="cd-modal-overlay">
        <div className="cd-modal" style={{ textAlign: 'center', padding: '40px 24px', maxWidth: 400 }}>
          <CheckCircle size={48} color="var(--success)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ margin: '0 0 8px', color: 'var(--text)' }}>¡Gracias por tus reseñas!</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Tus comentarios ayudan a otros clientes y mejoran la calidad de B2B Supply.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cd-modal-overlay">
      <div className="cd-modal" style={{ maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="cd-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text)' }}>Calificar Productos</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>¿Qué tal estuvo tu pedido {order.orderNumber}?</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>
        
        <div className="cd-modal-body" style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {items.map(item => {
            const rev = reviews[item.productId];
            const p = item.product || {};
            const img = p.images?.[0]?.url || 'https://via.placeholder.com/80';
            
            return (
              <div key={item.productId} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                  <img src={img} alt={p.name} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: 'var(--text)' }}>{p.name || 'Producto'}</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cantidad comprada: {item.quantity}</p>
                  </div>
                </div>

                {/* Stars */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>Calificación:</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1,2,3,4,5].map(s => (
                      <Star 
                        key={s} size={24} 
                        fill={s <= rev.stars ? '#fbbf24' : 'transparent'} 
                        color={s <= rev.stars ? '#fbbf24' : '#cbd5e1'}
                        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                        onClick={() => handleStarClick(item.productId, s)}
                      />
                    ))}
                  </div>
                </div>

                {/* Comment */}
                <textarea 
                  placeholder="Cuéntanos más sobre la calidad del producto y el servicio..."
                  value={rev.comment}
                  onChange={(e) => handleCommentChange(item.productId, e.target.value)}
                  style={{ width: '100%', height: 80, padding: 12, borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'inherit', resize: 'vertical', marginBottom: 16 }}
                />

                {/* Image Upload */}
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>Adjuntar pruebas / fotos (Opcional):</span>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {rev.images.map((imgUrl, i) => (
                      <div key={i} style={{ position: 'relative', width: 60, height: 60 }}>
                        <img src={imgUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                        <button 
                          onClick={() => removeImage(item.productId, i)}
                          style={{ position: 'absolute', top: -6, right: -6, background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                        ><X size={12} /></button>
                      </div>
                    ))}
                    <label style={{ width: 60, height: 60, border: '1px dashed var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                      <Upload size={20} />
                      <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(item.productId, e)} />
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="cd-modal-footer" style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12, background: '#f8fafc' }}>
          <button onClick={onClose} className="cd-btn-ghost" disabled={loading}>Omitir por ahora</button>
          <button onClick={handleSubmit} className="cd-btn-primary" disabled={loading}>
            {loading ? 'Enviando...' : 'Publicar Reseñas'}
          </button>
        </div>
      </div>
    </div>
  );
}
