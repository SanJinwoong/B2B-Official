import { useState, useEffect } from 'react';
import { X, ShoppingCart, Trash2, Plus, Minus, ShoppingBag, ArrowRight, CreditCard, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { marketplaceApi } from '../../../api/api';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export default function CartDrawer({ onClose, onCartChange }) {
  const [cart, setCart]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [checking, setChecking] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const navigate = useNavigate();

  const fetchCart = async () => {
    try {
      const r = await marketplaceApi.getCart();
      setCart(r.data.data);
      onCartChange?.(r.data.data?.itemCount || 0);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCart(); }, []);

  const handleQtyChange = async (itemId, qty, moq = 1) => {
    if (qty < moq) return;
    try {
      await marketplaceApi.updateCartItem(itemId, qty);
      fetchCart();
    } catch(e) { alert(e.response?.data?.message || 'Error.'); }
  };

  const handleRemove = async (itemId) => {
    try {
      await marketplaceApi.removeCartItem(itemId);
      fetchCart();
    } catch(e) { console.error(e); }
  };

  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handleCheckout = async () => {
    setChecking(true);
    try {
      // Simulate network delay for payment processing
      await new Promise(r => setTimeout(r, 1500));
      await marketplaceApi.checkout({});
      
      setChecking(false);
      setPaymentSuccess(true);
      
      // Wait for user to see success, then navigate
      setTimeout(() => {
        setShowPayment(false);
        onClose();
        navigate('/client/orders');
      }, 2500);

    } catch(e) {
      alert(e.response?.data?.message || 'Error al procesar el pedido.');
      setChecking(false);
    }
  };

  const items = cart?.items || [];
  const total = cart?.total || 0;

  return (
    <>
      <div className="cart-backdrop" onClick={onClose} />
      <div className="cart-drawer">
        {/* Header */}
        <div className="cart-header">
          <div className="cart-header-title">
            <ShoppingCart size={18}/>
            <span>Carrito de Compras</span>
            {items.length > 0 && <span className="cart-item-count">{items.length}</span>}
          </div>
          <button className="cart-close" onClick={onClose}><X size={20}/></button>
        </div>

        {/* Body */}
        <div className="cart-body">
          {loading && <div className="cart-loading"><div className="sc-spinner"/></div>}

          {!loading && items.length === 0 && (
            <div className="cart-empty">
              <ShoppingBag size={48} strokeWidth={1}/>
              <h3>Tu carrito está vacío</h3>
              <p>Explora el marketplace y añade productos</p>
              <button className="mk-btn-primary" onClick={onClose}>Explorar Marketplace</button>
            </div>
          )}

          {!loading && items.map(item => {
            const img = item.product?.images?.find(i => i.isPrimary)?.url || item.product?.images?.[0]?.url;
            const moq = item.product?.moq || 1;
            return (
              <div key={item.id} className="cart-item">
                <div className="cart-item-img">
                  {img ? <img src={img} alt={item.product.name}/> : <ShoppingBag size={20} strokeWidth={1}/>}
                </div>
                <div className="cart-item-info">
                  <div className="cart-item-supplier">{item.product?.supplierName}</div>
                  <div className="cart-item-name">{item.product?.name}</div>
                  <div className="cart-item-price">{fmt(item.priceSnapshot)}/{item.product?.unit}</div>
                  <div className="cart-item-qty">
                    <button onClick={() => handleQtyChange(item.id, item.quantity - moq, moq)}
                      disabled={item.quantity <= moq}><Minus size={12}/></button>
                    <span>{item.quantity.toLocaleString()}</span>
                    <button onClick={() => handleQtyChange(item.id, item.quantity + moq, moq)}><Plus size={12}/></button>
                    <span className="cart-item-unit">{item.product?.unit}</span>
                  </div>
                </div>
                <div className="cart-item-right">
                  <div className="cart-item-subtotal">{fmt(item.subtotal)}</div>
                  <button className="cart-item-remove" onClick={() => handleRemove(item.id)}><Trash2 size={14}/></button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {!loading && items.length > 0 && (
          <div className="cart-footer">
            <div className="cart-footer-note">
              Las órdenes se generan por proveedor. Se crearán {new Set(items.map(i => i.product?.supplierId)).size} orden(es).
            </div>
            <div className="cart-total-row">
              <span>Total estimado</span>
              <strong className="cart-total">{fmt(total)}</strong>
            </div>
            <button className="cart-checkout-btn" onClick={() => setShowPayment(true)}>
              Confirmar Pedido <ArrowRight size={16}/>
            </button>
          </div>
        )}
      </div>

      {/* ── Modal de Simulación de Pago ── */}
      {showPayment && (
        <div className="cart-backdrop" style={{ zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="cart-drawer" style={{ right: 'auto', width: '400px', height: 'auto', borderRadius: '12px', padding: '24px', transition: 'all 0.3s' }}>
            {paymentSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle size={60} color="var(--success)" style={{ margin: '0 auto 16px', animation: 'bounce 0.5s ease' }} />
                <h2 style={{ color: 'var(--success)', marginBottom: '8px' }}>¡Pago Exitoso!</h2>
                <p style={{ color: 'var(--text-muted)' }}>Órdenes generadas correctamente. Los proveedores han sido notificados.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><CreditCard size={20} /> Pago Seguro B2B</h3>
                  <button onClick={() => !checking && setShowPayment(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <X size={20} />
                  </button>
                </div>
                <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total a Pagar</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>{fmt(total)}</div>
                </div>
                
                <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Método de Pago</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <div style={{ width: '40px', height: '24px', background: '#1e3a8a', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 'bold' }}>VISA</div>
                    <div style={{ fontFamily: 'monospace', letterSpacing: '2px', color: 'var(--text)' }}>**** **** **** 4242</div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '12px', textAlign: 'center' }}>
                    Modo Simulación: Se aprobará automáticamente la transacción bancaria.
                  </div>
                </div>

                <button 
                  className="cart-checkout-btn" 
                  onClick={handleCheckout} 
                  disabled={checking}
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', background: checking ? 'var(--text-muted)' : 'var(--accent)' }}
                >
                  {checking ? (
                    <>
                      <div className="sc-spinner" style={{ width: 16, height: 16, borderTopColor: '#fff', marginRight: 8 }}/> 
                      Procesando pago...
                    </>
                  ) : (
                    <>Pagar {fmt(total)} <CheckCircle size={16} /></>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
