import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ArrowRight } from 'lucide-react';
import { clientOrdersApi } from '../../../api/api';

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
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('Todos');
  const [search,  setSearch]  = useState('');

  useEffect(() => { clientOrdersApi.getMy().then(r=>setOrders(r.data?.data || [])).finally(()=>setLoading(false)); }, []);

  const filtered = (orders || []).filter(o => {
    const matchF = filter==='Todos' || o.status===FILTER_STATUS[filter];
    const matchS = (o.orderNumber||'').toLowerCase().includes(search.toLowerCase()) ||
                   (o.orderItems?.[0]?.product?.name||'').toLowerCase().includes(search.toLowerCase());
    return matchF && matchS;
  });

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
        <input className="cd-search" placeholder="Buscar por referencia o producto..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <div className="cd-filter-pills">
          {FILTERS.map(f=><button key={f} className={`cd-pill${filter===f?' active':''}`} onClick={()=>setFilter(f)}>{f}</button>)}
        </div>
      </div>

      {filtered.length===0 && <div className="cd-empty"><div className="cd-empty-icon"><Package size={22}/></div><p className="cd-empty-text">No hay pedidos en esta categoría.</p></div>}

      {filtered.map(order => {
        const done = (order.phases||[]).filter(p=>p.status==='DONE').length;
        const pct  = Math.round((done/5)*100);
        const {label,badge} = STATUS_MAP[order.status]||{label:order.status,badge:'gray'};
        return (
          <Link to={`/client/orders/${order.id}`} key={order.id} className="cd-card" style={{display:'block',textDecoration:'none'}}>
            <div className="cd-card-header" style={{cursor:'pointer'}}>
              <div className="cd-card-icon"><Package size={16}/></div>
              <div className="cd-card-meta">
                <div style={{display:'flex',alignItems:'center',gap:'.6rem',flexWrap:'wrap'}}>
                  <span className="cd-card-id" style={{color:'#2563eb'}}>{order.orderNumber}</span>
                  <span className={`cd-badge ${badge}`}>{label}</span>
                  {order.sampleStatus==='PENDING' && <span className="cd-badge yellow no-dot">⚠ Muestra por aprobar</span>}
                </div>
                <div className="cd-card-title" style={{marginTop:'.2rem'}}>{order.orderItems?.[0]?.product?.name||'Pedido'}</div>
                <div className="cd-progress-row" style={{marginTop:'.4rem'}}>
                  <span className="cd-progress-label">Fase {done}/5</span>
                  <div className="cd-progress-bar"><div className={`cd-progress-fill${done===5?' complete':''}`} style={{width:`${pct}%`}}/></div>
                  {order.deliveryDate && <span className="cd-progress-date">Entrega: {fmtDate(order.deliveryDate)}</span>}
                </div>
              </div>
              <div className="cd-card-right">
                <div>
                  <div className="cd-card-amount">${(order.clientAmount||0).toLocaleString()}</div>
                  <div className="cd-card-currency">MXN</div>
                </div>
                <ArrowRight size={16} style={{color:'#94a3b8'}}/>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
