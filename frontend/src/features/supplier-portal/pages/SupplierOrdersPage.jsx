import { useState, useEffect } from 'react';
import { Package, Search, Box, CheckCircle, Truck, Clipboard, Clock, ArrowRight, ImageIcon } from 'lucide-react';
import { supplierOrdersApi } from '../../../api/api';
import '../components/supplier-catalog.css'; 

const STATUS_CONFIG = {
  PENDING:         { label: 'Pendiente',       color: '#6b7280', bg: '#f3f4f6', icon: Clock },
  IN_PRODUCTION:   { label: 'En Producción',   color: '#2563eb', bg: '#dbeafe', icon: Box },
  QUALITY_CONTROL: { label: 'Control Calidad', color: '#d97706', bg: '#fef3c7', icon: Clipboard },
  IN_TRANSIT:      { label: 'En Tránsito',     color: '#0284c7', bg: '#e0f2fe', icon: Truck },
  DELIVERED:       { label: 'Entregado',       color: '#16a34a', bg: '#dcfce7', icon: CheckCircle },
};

const NEXT_STATUS = {
  PENDING: 'IN_PRODUCTION',
  IN_PRODUCTION: 'QUALITY_CONTROL',
  QUALITY_CONTROL: 'IN_TRANSIT',
  IN_TRANSIT: null, 
  DELIVERED: null,
};

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export default function SupplierOrdersPage() {
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [updating, setUpdating] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const r = await supplierOrdersApi.getOrders();
      setOrders(r.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId, currentStatus) => {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;

    setUpdating(orderId);
    try {
      // Simulate slight delay for animation UX
      await new Promise(r => setTimeout(r, 600)); 
      await supplierOrdersApi.updateStatus(orderId, next);
      
      // Update local state smoothly without full reload
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: next } : o));
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(null);
    }
  };

  const filtered = orders.filter(o => 
    o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
    o.clientAlias?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="sp-page">
      <div className="sp-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="sp-page-title">Gestión de Pedidos</h1>
          <p className="sp-page-sub">Administra las ventas del Marketplace de forma rápida y sin interrupciones.</p>
        </div>
      </div>

      <div className="sp-toolbar" style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <div className="sp-search-box" style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por # de orden o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', outline: 'none' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Cargando pedidos...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <Package size={48} strokeWidth={1} style={{ opacity: 0.5, marginBottom: '16px' }} />
            <br/>No se encontraron pedidos.
          </div>
        ) : (
          filtered.map(order => {
            const conf = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
            const Icon = conf.icon;
            const nextStatus = NEXT_STATUS[order.status];
            const isUpdating = updating === order.id;

            // Info from items
            const firstItem = order.items?.[0];
            const extraItemsCount = (order.items?.length || 1) - 1;

            return (
              <div key={order.id} style={{ 
                background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', 
                padding: '20px', display: 'flex', alignItems: 'center', gap: '24px',
                transition: 'all 0.3s ease',
                boxShadow: isUpdating ? '0 0 0 2px var(--accent)' : 'none',
                opacity: isUpdating ? 0.7 : 1
              }}>
                {/* Imagen del Producto */}
                <div style={{ 
                  width: '80px', height: '80px', borderRadius: '8px', background: 'var(--surface-2)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0
                }}>
                  {firstItem?.image ? (
                    <img src={firstItem.image} alt="Producto" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <ImageIcon size={24} color="var(--text-muted)" />
                  )}
                </div>

                {/* Detalles principales */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text)' }}>{order.orderNumber}</h3>
                    <span style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '6px', 
                      padding: '4px 10px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 600,
                      background: conf.bg, color: conf.color, transition: 'all 0.3s'
                    }}>
                      <Icon size={12} /> {conf.label}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 500, marginBottom: '4px' }}>
                    {order.clientAlias || 'Cliente B2B'}
                  </div>
                  
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {firstItem?.quantity}x {firstItem?.productName || 'Producto B2B'}
                    {extraItemsCount > 0 && <span style={{ color: 'var(--accent)', fontWeight: 600 }}> (+{extraItemsCount} más)</span>}
                  </div>
                </div>

                {/* Monto y Fecha */}
                <div style={{ textAlign: 'right', paddingRight: '24px', borderRight: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>
                    {fmt(order.supplierAmount)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {new Date(order.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </div>

                {/* Acciones */}
                <div style={{ width: '180px', display: 'flex', justifyContent: 'flex-end' }}>
                  {nextStatus ? (
                    <button 
                      onClick={() => handleUpdateStatus(order.id, order.status)}
                      disabled={isUpdating}
                      style={{
                        padding: '10px 16px', background: isUpdating ? 'var(--text-muted)' : 'var(--accent)', 
                        color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', 
                        fontWeight: 600, cursor: isUpdating ? 'wait' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
                        width: '100%', justifyContent: 'center'
                      }}
                    >
                      {isUpdating ? (
                        <div className="sc-spinner" style={{ width: 14, height: 14, borderTopColor: '#fff' }}/>
                      ) : (
                        <>Mover a {STATUS_CONFIG[nextStatus].label} <ArrowRight size={14}/></>
                      )}
                    </button>
                  ) : (
                    <div style={{ 
                      padding: '10px 16px', background: 'var(--surface-2)', color: 'var(--text-muted)', 
                      borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center', width: '100%'
                    }}>
                      Esperando Entrega
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
