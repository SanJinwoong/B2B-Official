import { useState, useEffect } from 'react';
import { Package, Search, Box, CheckCircle, Truck, Clipboard, Clock, ArrowRight, ImageIcon, MessageCircle, XCircle } from 'lucide-react';
import { supplierOrdersApi, orderMessagesApi } from '../../../api/api';
import '../components/supplier-catalog.css';
import ChatPopup from '../../../components/ChatPopup';
import OrderDataRoom from '../../../components/OrderDataRoom';
import { useAuth } from '../../../context/AuthContext';

const STATUS_CONFIG = {
  PENDING:         { label: 'Pendiente',       color: '#6b7280', bg: '#f3f4f6', icon: Clock },
  IN_PRODUCTION:   { label: 'En Producción',   color: '#2563eb', bg: '#dbeafe', icon: Box },
  QUALITY_CONTROL: { label: 'Control Calidad', color: '#d97706', bg: '#fef3c7', icon: Clipboard },
  IN_TRANSIT:      { label: 'En Tránsito',     color: '#0284c7', bg: '#e0f2fe', icon: Truck },
  DELIVERED:       { label: 'Entregado',       color: '#16a34a', bg: '#dcfce7', icon: CheckCircle },
  CANCELLED:       { label: 'Cancelado',       color: '#6b7280', bg: '#f3f4f6', icon: XCircle },
};

const NEXT_STATUS = {
  PENDING: 'IN_PRODUCTION',
  IN_PRODUCTION: 'QUALITY_CONTROL',
  QUALITY_CONTROL: 'IN_TRANSIT',
  IN_TRANSIT: null,
  DELIVERED: null,
  CANCELLED: null,
};

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export default function SupplierOrdersPage() {
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [updating, setUpdating] = useState(null);

  // activeChatId: string | null
  const [activeChatId, setActiveChatId] = useState(null);
  // unread counts per order: { [orderId]: number }
  const [unreadCounts, setUnreadCounts] = useState({});
  const [activeDataRoomId, setActiveDataRoomId] = useState(null);
  
  const { user } = useAuth();

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

  useEffect(() => { fetchOrders(); }, []);

  // Poll unread counts for all orders every 12s
  useEffect(() => {
    const checkUnread = async () => {
      const counts = {};
      for (const order of orders) {
        try {
          const res = await orderMessagesApi.getMessages(order.id);
          const msgs = res.data?.data || [];
          // Count messages sent by the CLIENT (the other party) 
          // In a real app you'd track "last read" — here we approximate
          // by counting total messages from non-supplier senders
          counts[order.id] = msgs.filter(m => m.sender?.role !== 'SUPPLIER').length;
        } catch { /* ignore */ }
      }
      setUnreadCounts(counts);
    };

    if (orders.length > 0) {
      checkUnread();
      const t = setInterval(checkUnread, 12000);
      return () => clearInterval(t);
    }
  }, [orders]);

  const handleUpdateStatus = async (orderId, currentStatus) => {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;
    setUpdating(orderId);
    try {
      await new Promise(r => setTimeout(r, 600));
      await supplierOrdersApi.updateStatus(orderId, next);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: next } : o));
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(null);
    }
  };

  const toggleChat = (orderId) => {
    setActiveChatId(prev => {
      const next = prev === orderId ? null : orderId;
      if (next === orderId) {
        localStorage.setItem(`chat_read_sup_${orderId}`, unreadCounts[orderId] || 0);
      }
      return next;
    });
  };

  const filtered = orders.filter(o =>
    o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
    o.clientAlias?.toLowerCase().includes(search.toLowerCase()) ||
    (o.items?.[0]?.productName || '').toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    if (a.status === 'DELIVERED' && b.status !== 'DELIVERED') return 1;
    if (a.status !== 'DELIVERED' && b.status === 'DELIVERED') return -1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  // Find the single active chat order
  const activeChatOrder = filtered.find(o => o.id === activeChatId);

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
            placeholder="Buscar por # de orden, cliente o producto..."
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
            <br />No se encontraron pedidos.
          </div>
        ) : (
          filtered.map(order => {
            const conf = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
            const Icon = conf.icon;
            const nextStatus = NEXT_STATUS[order.status];
            const isUpdating = updating === order.id;
            const firstItem = order.items?.[0];
            const extraItemsCount = (order.items?.length || 1) - 1;
            const totalClientMsgs = unreadCounts[order.id] || 0;
            const lastRead = parseInt(localStorage.getItem(`chat_read_sup_${order.id}`) || '0', 10);
            const hasUnread = totalClientMsgs > lastRead && activeChatId !== order.id;
            const isDelivered = order.status === 'DELIVERED';
            const productName = firstItem?.productName || 'Producto B2B';

            return (
              <div key={order.id}>
              <div style={{
                background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)',
                padding: '20px', display: 'flex', alignItems: 'center', gap: '20px',
                transition: 'all 0.3s ease',
                boxShadow: isUpdating ? '0 0 0 2px var(--accent)' : 'none',
                opacity: isDelivered ? 0.6 : (isUpdating ? 0.7 : 1),
                filter: isDelivered ? 'grayscale(80%)' : 'none',
                pointerEvents: isDelivered ? 'none' : 'auto',
              }}>
                {/* Product image */}
                <div style={{
                  width: '72px', height: '72px', borderRadius: '8px', background: 'var(--surface-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
                }}>
                  {firstItem?.image
                    ? <img src={firstItem.image} alt={productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <ImageIcon size={24} color="var(--text-muted)" />
                  }
                </div>

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Product name FIRST — big & clear */}
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {productName}
                    {extraItemsCount > 0 && <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.85rem' }}> +{extraItemsCount} más</span>}
                  </div>

                  {/* Order number & status badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{order.orderNumber}</span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      padding: '3px 9px', borderRadius: '50px', fontSize: '0.72rem', fontWeight: 600,
                      background: conf.bg, color: conf.color,
                    }}>
                      <Icon size={11} /> {conf.label}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                    {order.clientAlias || 'Cliente B2B'} · {firstItem?.quantity ? `${firstItem.quantity} unidades` : ''}
                  </div>

                  {/* Shipping address — visible only to supplier */}
                  {order.shippingAddress && (
                    <div style={{
                      marginTop: '6px', display: 'flex', alignItems: 'flex-start', gap: '5px',
                      fontSize: '0.78rem', color: '#0369a1',
                      background: '#e0f2fe', borderRadius: '6px', padding: '4px 8px',
                      maxWidth: '380px'
                    }}>
                      <span style={{ flexShrink: 0, marginTop: '1px', fontWeight: 700 }}>Enviar a:</span>
                      <span style={{ wordBreak: 'break-word' }}>{order.shippingAddress}</span>
                    </div>
                  )}
                </div>

                {/* Amount & date */}
                <div style={{ textAlign: 'right', paddingRight: '20px', borderRight: '1px solid var(--border)', flexShrink: 0 }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>{fmt(order.supplierAmount)}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {new Date(order.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ width: '160px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                  {nextStatus && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <button
                        onClick={() => handleUpdateStatus(order.id, order.status)}
                        disabled={isUpdating || (order.status === 'IN_PRODUCTION' && order.sampleStatus === 'PENDING')}
                        style={{
                          padding: '9px 14px', background: isUpdating || (order.status === 'IN_PRODUCTION' && order.sampleStatus === 'PENDING') ? 'var(--text-muted)' : 'var(--accent)',
                          color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.82rem',
                          fontWeight: 700, cursor: isUpdating || (order.status === 'IN_PRODUCTION' && order.sampleStatus === 'PENDING') ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: '6px',
                          justifyContent: 'center', width: '100%',
                          fontFamily: 'var(--font-btn)',
                        }}
                      >
                        {isUpdating
                          ? <div className="sc-spinner" style={{ width: 13, height: 13, borderTopColor: '#fff' }} />
                          : <>{STATUS_CONFIG[nextStatus].label} <ArrowRight size={13} /></>
                        }
                      </button>
                      {order.status === 'IN_PRODUCTION' && order.sampleStatus === 'PENDING' && (
                        <div style={{ fontSize: '0.7rem', color: '#dc2626', textAlign: 'center', lineHeight: 1.2, fontWeight: 600 }}>
                          Muestra física pendiente de aprobación por el cliente
                        </div>
                      )}
                    </div>
                  )}

                  {/* Chat button with unread dot */}
                  <button
                    onClick={() => toggleChat(order.id)}
                    style={{
                      padding: '8px 14px', background: activeChatId === order.id ? '#2563eb' : 'transparent',
                      color: activeChatId === order.id ? '#fff' : 'var(--accent)',
                      border: `1px solid ${activeChatId === order.id ? '#2563eb' : 'var(--accent)'}`,
                      borderRadius: '8px', fontSize: '0.82rem',
                      fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      justifyContent: 'center', width: '100%', position: 'relative',
                      fontFamily: 'var(--font-btn)',
                    }}
                  >
                    {/* Unread notification dot */}
                    {hasUnread && (
                      <span style={{
                        position: 'absolute', top: '-5px', right: '-5px',
                        width: '12px', height: '12px', background: '#ef4444',
                        borderRadius: '50%', border: '2px solid var(--surface)',
                      }} />
                    )}
                    <MessageCircle size={14} />
                    Chat B2B
                  </button>

                  {/* Documentos button */}
                  <button
                    onClick={() => setActiveDataRoomId(prev => prev === order.id ? null : order.id)}
                    style={{
                      padding: '8px 14px', background: activeDataRoomId === order.id ? '#475569' : 'transparent',
                      color: activeDataRoomId === order.id ? '#fff' : '#475569',
                      border: `1px solid ${activeDataRoomId === order.id ? '#475569' : '#cbd5e1'}`,
                      borderRadius: '8px', fontSize: '0.82rem',
                      fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      justifyContent: 'center', width: '100%',
                      fontFamily: 'var(--font-btn)',
                    }}
                  >
                    <Clipboard size={14} />
                    Documentos
                  </button>
                </div>
              </div>
              
              {/* Order Data Room Inline */}
              {activeDataRoomId === order.id && (
                <div style={{ marginTop: '10px', marginBottom: '20px' }}>
                  <OrderDataRoom 
                    orderId={order.id} 
                    currentUserRole="SUPPLIER" 
                    currentUserId={user?.id}
                  />
                </div>
              )}
            </div>
            );
          })
        )}
      </div>

      {/* Floating Chat Popup (Only 1 allowed) */}
      {activeChatOrder && (
        <ChatPopup
          key={activeChatOrder.id}
          orderId={activeChatOrder.id}
          productName={activeChatOrder.items?.[0]?.productName || 'Producto'}
          productImage={activeChatOrder.items?.[0]?.image}
          participantName={activeChatOrder.clientAlias || 'Cliente B2B'}
          currentRole="SUPPLIER"
          onClose={() => toggleChat(activeChatOrder.id)}
        />
      )}
    </div>
  );
}
