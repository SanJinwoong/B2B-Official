import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Download, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { clientOrdersApi } from '../../../api/api';

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

  const load = () => clientOrdersApi.getById(id).then(r=>setOrder(r.data?.data || r.data)).finally(()=>setLoading(false));
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
              <button className="cd-btn-primary" style={{gap:'.4rem'}}><CheckCircle size={14}/> Aprobar Muestra</button>
              <button className="cd-btn-ghost" style={{color:'#dc2626',borderColor:'#fecaca'}}><XCircle size={14}/> Rechazar</button>
            </div>
          </div>
        </div>
      )}

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

      {/* Documentos */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'1.5rem',marginBottom:'1.5rem'}}>
        <h2 style={{fontSize:'1rem',fontWeight:700,color:'#0f172a',marginBottom:'1rem'}}>Centro de Documentos</h2>
        {docs.length===0
          ? <p style={{color:'#94a3b8',fontSize:'.875rem'}}>No hay documentos disponibles aún.</p>
          : <div className="cd-doc-list">
              {docs.map(doc=>(
                <div key={doc.id} className="cd-doc-item">
                  <span style={{fontSize:'1.1rem'}}>{DOC_ICONS[doc.type]||'📎'}</span>
                  <span className="cd-doc-label">{doc.label}</span>
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="cd-btn-ghost" style={{padding:'.4rem .75rem',fontSize:'.8rem'}}>
                    <Download size={13}/> Descargar
                  </a>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}
