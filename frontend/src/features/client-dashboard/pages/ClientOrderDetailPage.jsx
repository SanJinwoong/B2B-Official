import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Download, CheckCircle, XCircle, AlertTriangle, Truck, Star, Search } from 'lucide-react';
import { clientOrdersApi, rfqApi } from '../../../api/api';
import ReviewModal from '../components/ReviewModal';
import OrderChatBox from '../../../components/OrderChatBox';
import OrderDataRoom from '../../../components/OrderDataRoom';
import { useNavigate } from 'react-router-dom';

const PHASES = [
  { key:'INITIAL_PAYMENT',   label:'Pago Inicial' },
  { key:'PRODUCTION',        label:'Producción' },
  { key:'QUALITY_CONTROL',   label:'Control de Calidad' },
  { key:'SHIPPING',          label:'Envío' },
  { key:'DELIVERED',         label:'Entregado' },
];
const DOC_ICONS = { PROFORMA:'📄', PACKING_LIST:'📦', QUALITY_CERT:'✅', BILL_OF_LADING:'🚢', OTHER:'📎' };

function fmtDate(d){ return d?new Date(d).toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'}):'—'; }

export default function ClientOrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder]   = useState(null);
  const [loading,setLoading]= useState(true);
  const [confirmingReceipt, setConfirmingReceipt] = useState(null);
  const [respondingSample, setRespondingSample] = useState(null);
  const [reopening, setReopening] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const navigate = useNavigate();

  const load = () => clientOrdersApi.getById(id).then(r=>{
    setOrder(r.data?.data || r.data);
    setConfirmingReceipt(null); // Reset when reloaded
  }).finally(()=>setLoading(false));
  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="cd-empty"><p className="cd-empty-text">Cargando...</p></div>;
  if (!order)  return <div className="cd-empty"><p className="cd-empty-text">Pedido no encontrado.</p></div>;

  const phases  = order.phases  || [];
  const docs    = order.documents || [];
  const doneCount = phases.filter(p=>p.status==='DONE').length;

  const getPhaseStatus = (key) => {
    const p = phases.find(ph=>ph.phase===key);
    return p ? p.status : 'PENDING';
  };
  const stepClass = (key) => {
    const s = getPhaseStatus(key);
    if (s==='DONE') return 'done';
    if (s==='IN_PROGRESS') return 'active';
    return '';
  };

  return (
    <div>
      <Link to="/client/orders" style={{display:'inline-flex',alignItems:'center',gap:'.4rem',color:'#64748b',fontSize:'.875rem',textDecoration:'none',marginBottom:'1.25rem',fontWeight:600}}>
        <ArrowLeft size={14}/> Mis Pedidos
      </Link>

      <div className="cd-section-header">
        <div>
          <div style={{display:'flex',alignItems:'center',gap:'.75rem',marginBottom:'.25rem'}}>
            <h1 className="cd-section-title">{order.orderNumber}</h1>
          </div>
          <p className="cd-section-sub">{order.orderItems?.[0]?.product?.name||'Pedido'} · Entrega: {fmtDate(order.deliveryDate)}</p>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:'1.4rem',fontWeight:800,color:'#0f172a'}}>${(order.clientAmount||0).toLocaleString()}</div>
          <div style={{fontSize:'.75rem',color:'#94a3b8'}}>MXN</div>
        </div>
      </div>

      {/* Muestra por aprobar */}
      {order.sampleStatus==='PENDING' && (
        <div className="cd-sample-box">
          <AlertTriangle size={20} style={{color:'#d97706',flexShrink:0,marginTop:'2px'}}/>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,color:'#92400e',marginBottom:'.3rem'}}>Muestra física lista para revisión</div>
            <p style={{fontSize:'.875rem',color:'#78350f',margin:0}}>El proveedor ha enviado una muestra. Por favor revísala y confirma si aprueba o rechaza antes de continuar con la producción.</p>
            <div className="cd-sample-actions">
              <button 
                className="cd-btn-primary" 
                style={{gap:'.4rem', opacity: respondingSample ? 0.6 : 1}}
                disabled={!!respondingSample}
                onClick={async () => {
                  setRespondingSample('loading');
                  try {
                    await clientOrdersApi.respondSample(order.id, 'APPROVED');
                    load();
                  } catch (e) {
                    console.error(e);
                    setRespondingSample(null);
                  }
                }}
              >
                {respondingSample === 'loading' ? 'Procesando...' : <><CheckCircle size={14}/> Aprobar Muestra</>}
              </button>
              <button 
                className="cd-btn-ghost" 
                style={{color:'#dc2626',borderColor:'#fecaca', opacity: respondingSample ? 0.6 : 1}}
                disabled={!!respondingSample}
                onClick={async () => {
                  setRespondingSample('loading');
                  try {
                    await clientOrdersApi.respondSample(order.id, 'REJECTED');
                    load();
                  } catch (e) {
                    console.error(e);
                    setRespondingSample(null);
                  }
                }}
              >
                <XCircle size={14}/> Rechazar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orden Cancelada */}
      {order.status === 'CANCELLED' && (
        <div style={{
          background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem', 
          display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'all 0.3s'
        }}>
          <div>
            <h3 style={{ margin: 0, color: '#4b5563', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <XCircle size={18} /> Pedido Cancelado
            </h3>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
              {order.sampleStatus === 'REJECTED' 
                ? 'El pedido fue cancelado porque rechazaste la muestra física inicial.'
                : 'Este pedido ha sido cancelado y ya no está activo.'}
            </p>
          </div>
          
          {order.sampleStatus === 'REJECTED' && order.rfq && (
            <div>
              <button 
                className="cd-btn-primary" 
                style={{ 
                  background: reopening ? '#9ca3af' : '#2563eb', color: '#fff', border: 'none', gap: '8px',
                  opacity: reopening ? 0.7 : 1, cursor: reopening ? 'wait' : 'pointer'
                }}
                disabled={reopening}
                onClick={async () => {
                  setReopening(true);
                  try {
                    await rfqApi.reopenRFQ(order.rfq.id);
                    navigate('/client/rfqs');
                  } catch (e) {
                    console.error(e);
                    setReopening(false);
                  }
                }}
              >
                {reopening ? 'Reactivando...' : <><Search size={16} /> Buscar a otro proveedor</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Acción principal del cliente: Confirmar Recepción */}
      {order.status === 'IN_TRANSIT' && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--success)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem', 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'all 0.3s'
        }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--success)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={18} /> Pedido en Tránsito
            </h3>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              El proveedor ya ha enviado tu pedido. Por favor, confirma una vez que lo hayas recibido en buenas condiciones.
            </p>
          </div>
          
          {confirmingReceipt === 'done' ? (
            <div style={{ color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', animation: 'bounce 0.5s ease' }}>
              <CheckCircle size={20} /> ¡Recibido!
            </div>
          ) : (
            <button 
              className="cd-btn-primary" 
              style={{ 
                gap: '.4rem', background: confirmingReceipt ? 'var(--text-muted)' : 'var(--success)', 
                whiteSpace: 'nowrap', opacity: confirmingReceipt ? 0.8 : 1, transition: 'all 0.3s'
              }}
              disabled={!!confirmingReceipt}
              onClick={async () => {
                setConfirmingReceipt('loading');
                try {
                  await new Promise(r => setTimeout(r, 800)); // Smooth UX
                  await clientOrdersApi.confirmReceipt(order.id);
                  setConfirmingReceipt('done');
                  setTimeout(() => {
                    load();
                    setShowReview(true); // Abre el modal de reseñas
                  }, 1000);
                } catch(e) {
                  setConfirmingReceipt(null);
                  console.error(e);
                }
              }}
            >
              {confirmingReceipt === 'loading' ? (
                <><div className="sc-spinner" style={{ width: 14, height: 14, borderTopColor: '#fff' }}/> Confirmando...</>
              ) : (
                <><CheckCircle size={16} /> Confirmar Recepción</>
              )}
            </button>
          )}
        </div>
      )}

      {/* Acción si ya está entregado: Calificar Productos */}
      {order.status === 'DELIVERED' && (
        <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
          <button 
            className="cd-btn-primary" 
            style={{ background: '#f59e0b', color: '#fff', border: 'none', gap: '8px' }}
            onClick={() => setShowReview(true)}
          >
            <Star size={16} /> Calificar Productos
          </button>
        </div>
      )}

      {showReview && (
        <ReviewModal 
          order={order} 
          onClose={() => setShowReview(false)} 
          onSuccess={() => console.log('Reseñas guardadas')} 
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div>
          {/* Stepper */}
          <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'1.5rem 2rem',marginBottom:'1.5rem'}}>
            <h2 style={{fontSize:'1rem',fontWeight:700,color:'#0f172a',marginBottom:'1.5rem'}}>Estado del Pedido — Fase {doneCount}/5</h2>
            <div className="cd-stepper">
              {PHASES.map(({key,label},i) => (
                <div key={key} className={`cd-step ${stepClass(key)}`}>
                  <div className="cd-step-circle">
                    {getPhaseStatus(key)==='DONE' ? <CheckCircle size={16}/> : i+1}
                  </div>
                  <div className="cd-step-label">{label}</div>
                </div>
              ))}
            </div>
          </div>


          {/* Instrucciones de Pago B2B */}
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: '1.5rem 2rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0369a1', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
               Instrucciones de Pago (Plataforma B2B)
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#0c4a6e', marginBottom: '1rem' }}>
              Para iniciar la producción, realiza el pago correspondiente a la cuenta concentradora segura de la plataforma. 
              Nosotros retendremos el pago hasta que confirmes la recepción, garantizando tu seguridad.
            </p>
            <div style={{ background: '#fff', border: '1px solid #e0f2fe', borderRadius: '8px', padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Monto a Pagar</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>${(order.clientAmount || 0).toLocaleString('es-MX')} MXN</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Banco</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>BBVA México</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>CLABE Interbancaria</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', letterSpacing: '1px' }}>012345678901234567</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Concepto</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{order.orderNumber || `ORD-${order.id}`}</span>
              </div>
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#0369a1', fontWeight: 600 }}>
              📌 Importante: Una vez realizado el pago, sube tu comprobante (PDF o imagen) en el <strong>Data Room</strong> de abajo seleccionando el tipo "Comprobante de Pago".
            </div>
          </div>

          {/* Data Room (Archivos y Comprobantes) */}
          <div style={{ marginTop: '20px' }}>
            <OrderDataRoom 
              orderId={order.id} 
              currentUserRole="CLIENT" 
              currentUserId={order.clientId} 
            />
          </div>
        </div>

        {/* Chat de Negociación */}
        <div>
          <OrderChatBox orderId={order.id} currentRole="CLIENT" />
        </div>
      </div>
    </div>
  );
}
