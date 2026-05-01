import { useState, useEffect } from 'react';
import { X, ShoppingCart, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { marketplaceApi } from '../../../api/api';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export default function CartDrawer({ onClose, onCartChange }) {
  const [cart, setCart]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [checking, setChecking] = useState(false);
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

  const handleCheckout = async () => {
    setChecking(true);
    try {
      const r = await marketplaceApi.checkout({});
      const { orderCount } = r.data.data;
      onClose();
      navigate('/client/orders');
      alert(`¡Pedido confirmado! Se generaron ${orderCount} orden(es). Los proveedores serán notificados.`);
    } catch(e) {
      alert(e.response?.data?.message || 'Error al procesar el pedido.');
    } finally { setChecking(false); }
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
            <button className="cart-checkout-btn" onClick={handleCheckout} disabled={checking}>
              {checking ? 'Procesando...' : <>Confirmar Pedido <ArrowRight size={16}/></>}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
