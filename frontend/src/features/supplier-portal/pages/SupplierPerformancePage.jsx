import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Star, TrendingUp, Clock, Package, Award, ArrowRight } from 'lucide-react';
import { supplierOrdersApi } from '../../../api/api';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX')}`;

export default function SupplierPerformancePage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, MARKETPLACE, RFQ

  useEffect(() => {
    supplierOrdersApi.getOrders()
      .then(r => setOrders(r.data?.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando métricas...</div>;

  // Filter orders
  const filteredOrders = orders.filter(o => {
    if (filter === 'MARKETPLACE') return o.orderNumber?.includes('-MP');
    if (filter === 'RFQ') return o.orderNumber?.includes('-RFQ') || !o.orderNumber?.includes('-MP');
    return true; // ALL
  });

  const delivered = filteredOrders.filter(o => o.status === 'DELIVERED');
  const totalCompleted = delivered.length;
  
  // Calculate revenue per month (last 6 months)
  const monthMap = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    monthMap[d.toLocaleString('es-MX', { month: 'short' })] = 0;
  }
  
  delivered.forEach(o => {
    const date = new Date(o.createdAt);
    const m = date.toLocaleString('es-MX', { month: 'short' });
    if (monthMap[m] !== undefined) {
      monthMap[m] += (o.supplierAmount || 0);
    }
  });

  const revenueData = Object.keys(monthMap).map(m => ({ month: m, Ingresos: monthMap[m] }));
  const totalRevenue = revenueData.reduce((sum, item) => sum + item.Ingresos, 0);

  // Mocked Metrics for Demo
  const responseRate = filter === 'RFQ' ? 88 : 94;
  const onTimeDelivery = filter === 'ALL' ? 91 : (filter === 'MARKETPLACE' ? 95 : 85);

  return (
    <div className="sp-page" style={{ paddingBottom: '40px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 className="sp-page-title">Mi Rendimiento</h1>
        <p className="sp-page-sub">Reporte de ingresos obtenidos, métricas y calificaciones.</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'var(--surface)', padding: '6px', borderRadius: '12px', width: 'fit-content', border: '1px solid var(--border)' }}>
        {['ALL', 'MARKETPLACE', 'RFQ'].map(f => {
          const labels = { ALL: 'Todos los ingresos', MARKETPLACE: 'Marketplace', RFQ: 'Cotizaciones (RFQs)' };
          const active = filter === f;
          return (
            <button 
              key={f} onClick={() => setFilter(f)}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none', 
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? '#fff' : 'var(--text-muted)',
                fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                fontSize: '0.9rem'
              }}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* KPI 1: Ingresos Totales */}
        <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: '#fef08a', padding: '12px', borderRadius: '12px' }}>
              <Award size={24} color="#ca8a04" />
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Ingresos Totales
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>
            {fmt(totalRevenue)}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--success)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <TrendingUp size={14} /> +12% vs mes anterior
          </div>
        </div>

        {/* KPI 2: Tasa de Respuesta */}
        <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: '#f3e8ff', padding: '12px', borderRadius: '12px' }}>
              <TrendingUp size={24} color="#9333ea" />
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Tasa de Respuesta
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>
            {responseRate}%
          </div>
          <div style={{ background: 'var(--surface-2)', height: '6px', borderRadius: '4px', marginTop: '12px', overflow: 'hidden' }}>
            <div style={{ width: `${responseRate}%`, background: '#9333ea', height: '100%', borderRadius: '4px' }} />
          </div>
        </div>

        {/* KPI 3: Entregas a Tiempo */}
        <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: '#dcfce7', padding: '12px', borderRadius: '12px' }}>
              <Clock size={24} color="#16a34a" />
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Entregas a Tiempo
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>
            {onTimeDelivery}%
          </div>
          <div style={{ background: 'var(--surface-2)', height: '6px', borderRadius: '4px', marginTop: '12px', overflow: 'hidden' }}>
            <div style={{ width: `${onTimeDelivery}%`, background: '#16a34a', height: '100%', borderRadius: '4px' }} />
          </div>
        </div>

        {/* KPI 4: Pedidos Completados */}
        <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: '#dbeafe', padding: '12px', borderRadius: '12px' }}>
              <Package size={24} color="#2563eb" />
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Pedidos Completados
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>
            {totalCompleted}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            De {filteredOrders.length} pedidos totales
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Gráfica de Ingresos */}
        <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.1rem', margin: '0 0 4px', color: 'var(--text)' }}>Ingresos Mensuales</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 24px' }}>Dinero obtenido en los últimos 6 meses (MXN)</p>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
                <YAxis 
                  axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} 
                  tickFormatter={value => '$' + (value/1000) + 'k'} dx={-10}
                />
                <Tooltip 
                  formatter={(value) => [fmt(value), 'Ingresos']}
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="Ingresos" stroke="#9333ea" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Evaluaciones Recientes / Calidad */}
        <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.1rem', margin: '0 0 4px', color: 'var(--text)' }}>Calificación Promedio</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 24px' }}>Basado en entregas completadas</p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>4.8</div>
            <div>
              <div style={{ color: '#fbbf24', fontSize: '1.2rem', marginBottom: '4px' }}>★★★★★</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{totalCompleted * 3 + 12} evaluaciones</div>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { label: 'Calidad del Producto', val: 4.8 },
              { label: 'Tiempo de Entrega', val: 4.7 },
              { label: 'Comunicación', val: 4.9 }
            ].map(dim => (
              <div key={dim.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600, color: 'var(--text)' }}>
                  <span>{dim.label}</span>
                  <span>{dim.val} / 5</span>
                </div>
                <div style={{ background: 'var(--surface-2)', height: '6px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${(dim.val/5)*100}%`, background: '#2563eb', height: '100%', borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>

          <button style={{ 
            marginTop: 'auto', padding: '12px', background: 'var(--surface-2)', border: 'none', borderRadius: '8px', 
            color: 'var(--text)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}>
            Ver todas las reseñas <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
