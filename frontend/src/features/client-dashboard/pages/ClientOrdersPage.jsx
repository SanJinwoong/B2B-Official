import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ArrowRight, MessageCircle, Search } from 'lucide-react';
import { clientOrdersApi, orderMessagesApi } from '../../../api/api';
import ChatPopup from '../../../components/ChatPopup';
import { useAuth } from '../../../context/AuthContext';

const STATUS_MAP = {
  PENDING:         { label:'Pendiente',         badge:'gray'   },
  IN_PRODUCTION:   { label:'En Producción',     badge:'orange' },
  QUALITY_CONTROL: { label:'Control de Calidad',badge:'purple' },
  IN_TRANSIT:      { label:'En Tránsito',       badge:'teal'   },
  DELIVERED:       { label:'Entregado',          badge:'green'  },
};
const FILTERS = ['Todos','En Producción','Control de Calidad','En Tránsito','Entregado'];
const FILTER_STATUS = {'En Producción':'IN_PRODUCTION','Control de Calidad':'QUALITY_CONTROL','En Tránsito':'IN_TRANSIT','Entregado':'DELIVERED'};

function fmtDate(d){ return d?new Date(d).toLocaleDateString('es-MX',{day:'numeric',month:'short'}):'—'; }

export default function ClientOrdersPage() {
  const { user } = useAuth();
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('Todos');
  const [typeFilter, setTypeFilter] = useState('Todos');
  const [search,  setSearch]  = useState('');
  const [activeChatId, setActiveChatId] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    clientOrdersApi.getMy().then(r => setOrders(r.data?.data || [])).finally(() => setLoading(false));
  }, []);

  // Poll unread counts — count messages from SUPPLIER (the other side)
  useEffect(() => {
    const checkUnread = async () => {
      const counts = {};
      for (const order of orders) {
        try {
          const res = await orderMessagesApi.getMessages(order.id);
          const msgs = res.data?.data || [];
          counts[order.id] = msgs.filter(m => m.sender?.role === 'SUPPLIER').length;
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

  const toggleChat = (orderId) => {
    setActiveChatId(prev => {
      const next = prev === orderId ? null : orderId;
      if (next === orderId) {
        // Just opened this chat, save the current count as read
        localStorage.setItem(`chat_read_${orderId}`, unreadCounts[orderId] || 0);
      }
      return next;
    });
  };

  const filtered = (orders || []).filter(o => {
    const matchF = filter==='Todos' || o.status===FILTER_STATUS[filter];
    const matchT = typeFilter==='Todos' || (typeFilter==='Cotizaciones' ? o.rfq : !o.rfq);
    const matchS = (o.orderNumber||'').toLowerCase().includes(search.toLowerCase()) ||
                   (o.orderItems?.[0]?.product?.name||'').toLowerCase().includes(search.toLowerCase()) ||
                   (o.rfq?.title||'').toLowerCase().includes(search.toLowerCase());
    return matchF && matchT && matchS;
  }).sort((a, b) => {
    if (a.status === 'DELIVERED' && b.status !== 'DELIVERED') return 1;
    if (a.status !== 'DELIVERED' && b.status === 'DELIVERED') return -1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const activeChatOrder = filtered.find(o => o.id === activeChatId);

  if (loading) return <div className="cd-empty"><p className="cd-empty-text">Cargando...</p></div>;

  return (
    <div>
      <div className="cd-section-header">
        <div>
          <h1 className="cd-section-title">Mis Pedidos</h1>
          <p className="cd-section-sub">Órdenes de compra confirmadas y su estado.</p>
        </div>
      </div>
      <div className="cd-filters">
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input className="cd-search" style={{ width: '100%', paddingLeft: '38px', boxSizing: 'border-box' }} placeholder="Buscar por referencia o producto..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div className="cd-filter-pills">
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Estado:</span>
          {FILTERS.map(f=><button key={f} className={`cd-pill${filter===f?' active':''}`} onClick={()=>setFilter(f)}>{f}</button>)}
        </div>
      </div>

      {/* TABS DE ORIGEN COMO CARPETAS */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: '16px', gap: '4px', paddingLeft: '8px', marginTop: '10px' }}>
        {['Todos', 'Cotizaciones', 'Marketplace'].map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            style={{
              padding: '10px 24px',
              background: typeFilter === t ? '#fff' : '#f8fafc',
              border: '2px solid',
              borderColor: typeFilter === t ? 'var(--border) var(--border) #fff' : 'transparent',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
              marginBottom: '-2px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: typeFilter === t ? 700 : 600,
              color: typeFilter === t ? '#2563eb' : '#64748b',
              transition: 'all 0.2s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length===0 && <div className="cd-empty"><div className="cd-empty-icon"><Package size={22}/></div><p className="cd-empty-text">No hay pedidos en esta categoría.</p></div>}

      {filtered.map(order => {
        const done = (order.phases||[]).filter(p=>p.status==='DONE').length;
        const pct  = Math.round((done/5)*100);
        const {label,badge} = STATUS_MAP[order.status]||{label:order.status,badge:'gray'};
        const firstItem = order.orderItems?.[0];
        let productImg = firstItem?.product?.images?.find(i => i.isPrimary)?.url || firstItem?.product?.images?.[0]?.url || null;
        let title = firstItem?.product?.name || 'Pedido';
        const isRFQ = !!order.rfq;
        
        if (isRFQ) {
          title = order.rfq.title;
          try {
            const parsed = JSON.parse(order.rfq.images);
            if (Array.isArray(parsed) && parsed.length > 0) productImg = parsed[0];
          } catch (e) {}
        }
        const totalSupplierMsgs = unreadCounts[order.id] || 0;
        const lastRead = parseInt(localStorage.getItem(`chat_read_${order.id}`) || '0', 10);
        const hasUnread = totalSupplierMsgs > lastRead && activeChatId !== order.id;
        const isDelivered = order.status === 'DELIVERED';
        return (
          <div key={order.id} className={`cd-card ${isDelivered ? 'delivered-card' : ''}`} style={{ marginBottom: '12px', opacity: isDelivered ? 0.6 : 1, filter: isDelivered ? 'grayscale(80%)' : 'none' }}>
            {/* Main row — still navigable via ArrowRight link */}
            <div className="cd-card-header">
              <div className="cd-card-icon" style={{ 
                overflow: 'hidden', padding: 0, 
                background: productImg ? 'transparent' : 'var(--bg-blue)',
                width: '130px', height: '90px', flexShrink: 0, borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)'
              }}>
                {productImg
                  ? <img src={productImg} alt={firstItem?.product?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Package size={32}/>
                }
              </div>
              <div className="cd-card-meta" style={{ flex: 1 }}>
                <div style={{display:'flex',alignItems:'center',gap:'.6rem',flexWrap:'wrap'}}>
                  <span className="cd-card-id" style={{color:'#2563eb'}}>{order.orderNumber}</span>
                  {isRFQ ? <span className="cd-badge" style={{background:'#eef2ff',color:'#4f46e5', fontWeight: 600}}>Cotización a medida</span> : <span className="cd-badge" style={{background:'#f0fdf4',color:'#16a34a', fontWeight: 600}}>Marketplace B2B</span>}
                  <span className={`cd-badge ${badge}`}>{label}</span>
                  {order.sampleStatus==='PENDING' && <span className="cd-badge yellow no-dot">⚠ Muestra por aprobar</span>}
                </div>
                <div className="cd-card-title" style={{marginTop:'.2rem'}}>{title}</div>
                <div className="cd-progress-row" style={{marginTop:'.4rem'}}>
                  <span className="cd-progress-label">Fase {done}/5</span>
                  <div className="cd-progress-bar"><div className={`cd-progress-fill${done===5?' complete':''}`} style={{width:`${pct}%`}}/></div>
                  {order.deliveryDate && <span className="cd-progress-date">Entrega: {fmtDate(order.deliveryDate)}</span>}
                </div>
              </div>
              <div className="cd-card-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div className="cd-card-amount">${(order.clientAmount||0).toLocaleString()}</div>
                  <div className="cd-card-currency">MXN</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {/* Chat button */}
                  {!isDelivered ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleChat(order.id); }}
                      style={{
                        position: 'relative',
                        padding: '6px 12px',
                        background: activeChatId === order.id ? '#2563eb' : 'transparent',
                        color: activeChatId === order.id ? '#fff' : '#2563eb',
                        border: `1px solid ${activeChatId === order.id ? '#2563eb' : '#2563eb'}`, borderRadius: '8px',
                        fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '5px',
                        fontFamily: 'var(--font-btn)',
                      }}
                    >
                      {hasUnread && (
                        <span style={{
                          position: 'absolute', top: '-5px', right: '-5px',
                          width: '10px', height: '10px', background: '#ef4444',
                          borderRadius: '50%', border: '2px solid #fff',
                        }} />
                      )}
                      <MessageCircle size={13} /> Chat B2B
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, padding: '6px 0' }}>Completado</span>
                  )}
                  <Link to={`/client/orders/${order.id}`} onClick={e => e.stopPropagation()} style={{ color: '#94a3b8', display: 'flex', pointerEvents: isDelivered ? 'none' : 'auto' }}>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Floating Chat Popup (Only 1 allowed) */}
      {activeChatOrder && (() => {
        const firstItem = activeChatOrder.orderItems?.[0];
        let productImg = firstItem?.product?.images?.find(i => i.isPrimary)?.url || firstItem?.product?.images?.[0]?.url;
        let title = firstItem?.product?.name || 'Pedido';
        if (activeChatOrder.rfq) {
          title = activeChatOrder.rfq.title;
          try {
            const parsed = JSON.parse(activeChatOrder.rfq.images);
            if (Array.isArray(parsed) && parsed.length > 0) productImg = parsed[0];
          } catch (e) {}
        }
        return (
          <ChatPopup
            key={activeChatOrder.id}
            orderId={activeChatOrder.id}
            productName={title}
            productImage={productImg}
            participantName="Proveedor B2B"
            currentRole="CLIENT"
            onClose={() => toggleChat(activeChatOrder.id)}
          />
        );
      })()}
    </div>
  );
}
