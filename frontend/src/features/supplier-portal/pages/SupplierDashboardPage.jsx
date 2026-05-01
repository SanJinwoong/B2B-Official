import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Zap, Package, DollarSign, Star, ArrowRight, AlertTriangle, Box } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/api';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function StarRating({ v = 0, small }) {
  const size = small ? 12 : 14;
  return (
    <span style={{ color:'#fbbf24', fontSize:size }}>
      {[1,2,3,4,5].map(i => <span key={i} style={{ opacity: i <= Math.round(v) ? 1 : 0.3 }}>★</span>)}
      <span style={{ fontSize: size-1, marginLeft:4 }}>{v > 0 ? v.toFixed(1) : 'N/A'}</span>
    </span>
  );
}

const STATUS_LABEL = {
  PENDING:         { label: 'Pendiente',       cls: 'sp-badge-gray'  },
  IN_PRODUCTION:   { label: 'En Producción',   cls: 'sp-badge-blue'  },
  QUALITY_CONTROL: { label: 'Control Calidad', cls: 'sp-badge-amber' },
  IN_TRANSIT:      { label: 'En Tránsito',     cls: 'sp-badge-blue'  },
  DELIVERED:       { label: 'Entregado',        cls: 'sp-badge-green' },
};

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX')}`;

export default function SupplierDashboardPage() {
  const { user } = useAuth();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/supplier/dashboard')
      .then(r => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300, color:'var(--text-muted)' }}>
      Cargando dashboard...
    </div>
  );

  const stats   = data?.stats   || {};
  const metrics = data?.metrics || {};
  const chart   = data?.monthlyChart || [];
  const orders  = data?.recentOrders || [];

  return (
    <>
      {/* Greeting */}
      <div style={{ marginBottom:24 }}>
        <h1 className="sp-page-title">{greeting()}, {(user?.name || '').split(' ')[0]} 👋</h1>
        <p className="sp-page-sub" style={{ margin:0 }}>
          {user?.name} · {user?.email}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="sp-kpi-grid">
        <div className="sp-kpi-card">
          <div className="sp-kpi-icon" style={{ background:'#dbeafe' }}>
            <Zap size={18} color="#2563eb" />
          </div>
          {stats.newRFQs > 0 && <div className="sp-kpi-badge">{stats.newRFQs}</div>}
          <div>
            <div className="sp-kpi-value">{stats.newRFQs ?? 0}</div>
            <div className="sp-kpi-label">Nuevas Solicitudes (RFQ)</div>
            <Link to="/proveedor/rfqs" className="sp-kpi-link">Ver oportunidades →</Link>
          </div>
        </div>

        <div className="sp-kpi-card">
          <div className="sp-kpi-icon" style={{ background:'#dcfce7' }}>
            <Package size={18} color="#16a34a" />
          </div>
          <div>
            <div className="sp-kpi-value">{stats.inProduction ?? 0}</div>
            <div className="sp-kpi-label">Pedidos en Producción</div>
            <Link to="/proveedor/pedidos" className="sp-kpi-link">Gestionar pedidos →</Link>
          </div>
        </div>

        <div className="sp-kpi-card">
          <div className="sp-kpi-icon" style={{ background:'#dcfce7' }}>
            <DollarSign size={18} color="#16a34a" />
          </div>
          <div>
            <div className="sp-kpi-value" style={{ fontSize:'1.3rem' }}>{fmt(stats.toCobrar)}</div>
            <div className="sp-kpi-label">Por Cobrar (MXN)</div>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>
              {stats.inProduction ?? 0} pedidos
            </span>
          </div>
        </div>

        <div className="sp-kpi-card">
          <div className="sp-kpi-icon" style={{ background:'#fef3c7' }}>
            <Star size={18} color="#f59e0b" />
          </div>
          <div>
            <StarRating v={stats.avgRating} />
            <div className="sp-kpi-label" style={{ marginTop:4 }}>Calificación Promedio</div>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>
              {stats.totalRatings ?? 0} evaluaciones
            </span>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="sp-charts-row">
        {/* Bar chart */}
        <div className="sp-card">
          <div className="sp-card-title">Pedidos Mensuales</div>
          <div className="sp-card-sub">Últimos 6 meses — total vs entregados a tiempo</div>
          {chart.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chart} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} />
                <Legend wrapperStyle={{ fontSize:11 }} />
                <Bar dataKey="total"  name="Total"    fill="#2563eb" radius={[4,4,0,0]} />
                <Bar dataKey="onTime" name="A tiempo" fill="#0ea5e9" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height:180, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:13 }}>
              Sin datos de pedidos aún
            </div>
          )}
        </div>

        {/* Métricas clave */}
        <div className="sp-card">
          <div className="sp-card-title">Métricas Clave</div>
          <div style={{ marginTop:14 }}>
            <div className="sp-metric-row">
              <span className="sp-metric-label">↗ Tasa de Respuesta</span>
              <span className="sp-metric-pct">{metrics.responseRate}%</span>
            </div>
            <div className="sp-metric-bar" style={{ marginBottom:14 }}>
              <div className="sp-metric-fill" style={{ width:`${metrics.responseRate}%` }} />
            </div>

            <div className="sp-metric-row">
              <span className="sp-metric-label">⏱ Entregas a Tiempo</span>
              <span className="sp-metric-pct">{metrics.onTimeDelivery}%</span>
            </div>
            <div className="sp-metric-bar" style={{ marginBottom:18 }}>
              <div className="sp-metric-fill green" style={{ width:`${metrics.onTimeDelivery}%` }} />
            </div>

            {[
              ['Calidad',       metrics.qualityRating],
              ['Entrega',       metrics.deliveryRating],
              ['Comunicación',  metrics.communicationRating],
            ].map(([label, val]) => (
              <div key={label} className="sp-rating-row">
                <span className="sp-rating-label">{label}</span>
                <StarRating v={val} small />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="sp-bottom-row">
        {/* Pedidos activos */}
        <div className="sp-card">
          <div className="sp-list-header">
            <div>
              <div className="sp-card-title">Pedidos Activos</div>
            </div>
            <Link to="/proveedor/pedidos" className="sp-list-link">Ver todos ↗</Link>
          </div>
          {orders.length === 0 ? (
            <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-muted)', fontSize:13 }}>
              No tienes pedidos activos todavía.
            </div>
          ) : orders.map((o) => {
            const st = STATUS_LABEL[o.status] || { label: o.status, cls: 'sp-badge-gray' };
            return (
              <div key={o.id} className="sp-order-item">
                <div className="sp-order-icon"><Box size={16} /></div>
                <div style={{ minWidth:0 }}>
                  <div className="sp-order-ref">{o.orderNumber || `#${o.id}`}</div>
                  <div className="sp-order-desc">{o.clientAlias}</div>
                </div>
                <div className="sp-order-right">
                  <span className={`sp-badge ${st.cls}`}>{st.label}</span>
                  <div className="sp-order-date" style={{ marginTop:4 }}>
                    {o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString('es-MX',{day:'2-digit',month:'short'}) : '—'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Últimas oportunidades */}
        <div className="sp-card">
          <div className="sp-list-header">
            <div className="sp-card-title">Últimas Oportunidades</div>
            <Link to="/proveedor/rfqs" className="sp-list-link">Ver todas ↗</Link>
          </div>
          <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-muted)', fontSize:13 }}>
            Las oportunidades se mostrarán aquí cuando el administrador te asigne RFQs.
          </div>
        </div>
      </div>
    </>
  );
}
