import { useEffect, useState } from 'react';
import { adminApi } from '../../../api/api';
import { ShoppingCart, Clock, AlertCircle, Store } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const STATUS_LABELS = {
  PENDING: 'Pendiente',
  APPROVED: 'Asignado',
  IN_PRODUCTION: 'En Producción',
  QUALITY_CONTROL: 'Ctrl. Calidad',
  IN_TRANSIT: 'En Tránsito',
  DELIVERED: 'Completado',
  CANCELLED: 'Cancelado',
};

const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await adminApi.getDashboardStats();
        setStats(res.data.data);
      } catch (err) {
        console.error('Error al cargar dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Cargando dashboard...</div>;
  if (!stats) return <div style={{ padding: '2rem' }}>Error al cargar información.</div>;

  const { summary, charts, recentOrders } = stats;

  const summaryCards = [
    { title: 'Pedidos Activos', value: summary.activeOrders, subtitle: 'En progreso o asignados', icon: ShoppingCart, color: 'var(--accent)' },
    { title: 'Pedidos Pendientes', value: summary.pendingOrders, subtitle: 'Sin asignar proveedor', icon: Clock, color: 'var(--warning)' },
    { title: 'Pedidos Retrasados', value: summary.delayedOrders, subtitle: 'Requieren atención', icon: AlertCircle, color: 'var(--error)' },
    { title: 'Proveedores Activos', value: summary.activeSuppliers, subtitle: 'De 5 totales', icon: Store, color: 'var(--success)' },
  ];

  // Map backend status to frontend friendly labels for bar chart
  const barData = charts.ordersByStatus.map(d => ({
    name: STATUS_LABELS[d.status] || d.status,
    cantidad: d.count
  }));

  const formatCurrency = (val) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
    <>
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .dashboard-animated {
            animation: fadeInUp 0.6s ease-out forwards;
          }
        `}
      </style>
      <div className="dashboard-animated" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, color: 'var(--text)' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.2rem' }}>Resumen general de la plataforma</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        {summaryCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text)' }}>{card.title}</span>
                <Icon size={18} color={card.color} />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text)', marginTop: '0.5rem' }}>{card.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{card.subtitle}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Bar Chart */}
        <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1.5rem' }}>Pedidos por Estado</h3>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: 'var(--bg)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar 
                  dataKey="cantidad" 
                  fill="#3b82f6" 
                  radius={[4, 4, 0, 0]} 
                  isAnimationActive={true} 
                  animationDuration={1500} 
                  animationEasing="ease-out" 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1.5rem' }}>Rendimiento de Proveedores</h3>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.supplierPerformance}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-out"
                >
                  {charts.supplierPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '0.8rem', fontWeight: '600' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Orders List */}
      <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1.5rem' }}>Pedidos Recientes</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {recentOrders.map((order) => {
            let statusColor = 'var(--text-muted)';
            let statusBg = 'var(--bg)';
            if (['APPROVED', 'IN_PRODUCTION', 'QUALITY_CONTROL'].includes(order.status)) { statusColor = 'var(--accent)'; statusBg = 'rgba(59, 130, 246, 0.1)'; }
            if (['DELIVERED'].includes(order.status)) { statusColor = 'var(--success)'; statusBg = 'var(--success-bg)'; }
            if (['PENDING'].includes(order.status)) { statusColor = 'var(--warning)'; statusBg = 'var(--warning-bg)'; }
            
            return (
              <div key={order.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                    <ShoppingCart size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text)' }}>{order.clientName}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{order.description}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '700', color: 'var(--text)' }}>{formatCurrency(order.amount)}</div>
                  <div style={{ 
                    display: 'inline-block', 
                    marginTop: '0.2rem', 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '4px', 
                    fontSize: '0.75rem', 
                    fontWeight: 'bold',
                    color: statusColor,
                    background: statusBg 
                  }}>
                    {STATUS_LABELS[order.status] || order.status}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </>
  );
};

export default AdminDashboardPage;
