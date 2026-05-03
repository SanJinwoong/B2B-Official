import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, FileText, CreditCard, Plus, ArrowRight,
  CheckCircle, AlertTriangle, MessageCircle, Clock, ChevronRight,
} from 'lucide-react';
import { dashboardApi, rfqApi } from '../../../api/api';
import { useAuth } from '../../../context/AuthContext';

/* ── Constants ────────────────────────────────────────────────────────────── */
const PHASE_KEYS = ['INITIAL_PAYMENT', 'PRODUCTION', 'QUALITY_CONTROL', 'SHIPPING', 'DELIVERED'];

const STATUS_MAP = {
  PENDING:         { label: 'Pendiente',          badge: 'gray'   },
  IN_PRODUCTION:   { label: 'En Producción',      badge: 'orange' },
  QUALITY_CONTROL: { label: 'Control de Calidad', badge: 'purple' },
  IN_TRANSIT:      { label: 'En Tránsito',        badge: 'teal'   },
  DELIVERED:       { label: 'Entregado',           badge: 'green'  },
};

/* ── Greeting ─────────────────────────────────────────────────────────────── */
function getGreeting(name) {
  const h = new Date().getHours();
  const first = name?.split(' ')[0] || 'Cliente';
  if (h >= 6  && h < 12) return `¡Buenos días, ${first}!`;
  if (h >= 12 && h < 19) return `¡Buenas tardes, ${first}!`;
  return `¡Buenas noches, ${first}!`;
}

/* ── Mini stepper (inline, per order card) ───────────────────────────────── */
function MiniStepper({ phases = [] }) {
  return (
    <div className="cd-mini-stepper-wrap">
      <div className="cd-mini-stepper">
        {PHASE_KEYS.map((key, i) => {
          const ph = phases.find(p => p.phase === key);
          const st = ph?.status || 'PENDING';
          const isDone = st === 'DONE';
          const isActive = st === 'IN_PROGRESS';
          return (
            <div key={key} className="cd-mini-step-unit">
              <div className={`cd-mini-dot ${isDone ? 'done' : isActive ? 'active' : 'pending'}`}>
                {isDone ? <CheckCircle size={11} /> : i + 1}
              </div>
              {i < PHASE_KEYS.length - 1 && (
                <div className={`cd-mini-line ${isDone ? 'done' : ''}`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="cd-mini-step-labels">
        <span>Pago Inicial</span>
        <span>Entregado</span>
      </div>
    </div>
  );
}

/* ── Stat card ────────────────────────────────────────────────────────────── */
function StatCard({ icon, iconBg, label, value, sub, subColor, linkLabel, linkTo, danger }) {
  const navigate = useNavigate();
  return (
    <div className={`cd-dash-stat${danger ? ' danger' : ''}`}>
      <div className="cd-dash-stat-top">
        <div className={`cd-dash-stat-icon ${iconBg}`}>{icon}</div>
        {linkLabel && (
          <button className="cd-dash-stat-link" style={{ color: danger ? '#dc2626' : '#2563eb' }}
            onClick={() => navigate(linkTo)}>
            {linkLabel}
          </button>
        )}
      </div>
      <div className={`cd-dash-stat-value ${danger ? 'danger' : ''}`}>{value}</div>
      <div className={`cd-dash-stat-label`} style={{ color: danger ? '#dc2626' : undefined }}>{label}</div>
      {sub && (
        <div className="cd-dash-stat-sub" style={{ color: subColor || '#f59e0b' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function ClientDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getSummary()
      .then(r => setData(r.data))
      .catch(e => console.error('Dashboard load error:', e))
      .finally(() => setLoading(false));
  }, []);

  const stats        = data?.stats        || {};
  const recentOrders = data?.recentOrders || [];
  const readyRFQs    = data?.readyRFQs    || [];

  return (
    <div>
      {/* ── Header row ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em' }}>
            {getGreeting(user?.name)}
          </h1>
          <p style={{ fontSize: '.9rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>
            Aquí tienes un resumen de tu cuenta.
          </p>
        </div>
        <button className="cd-btn-primary" style={{ gap: '.5rem', flexShrink: 0 }}
          onClick={() => navigate('/client/rfqs')}>
          <Plus size={16} /> Nueva Solicitud
        </button>
      </div>

      {/* ── 3 Stat cards ── */}
      <div className="cd-dash-stats-row">
        <StatCard
          icon={<Package size={18} />}
          iconBg="blue"
          label="Pedidos Activos"
          value={loading ? '—' : stats.activeOrders ?? 0}
          sub={stats.samplesCount > 0 ? `${stats.samplesCount} muestra${stats.samplesCount > 1 ? 's' : ''} por aprobar` : null}
          subColor="#f59e0b"
          linkLabel="Ver todos"
          linkTo="/client/orders"
        />
        <StatCard
          icon={<FileText size={18} />}
          iconBg="purple"
          label="Cotizaciones por Aprobar"
          value={loading ? '—' : stats.pendingRFQs ?? 0}
          sub={stats.pendingRFQs > 0 ? 'Requieren tu aprobación' : null}
          subColor="#7c3aed"
          linkLabel="Revisar"
          linkTo="/client/rfqs"
        />
        <StatCard
          icon={<CreditCard size={18} />}
          iconBg="red"
          label={stats.overdueAmount > 0 ? 'Pago Vencido' : 'Sin pagos vencidos'}
          value={loading ? '—' : stats.overdueAmount > 0
            ? <><span style={{ fontSize: '1.9rem', fontWeight: 900, color: '#dc2626' }}>${stats.overdueAmount.toLocaleString()}</span><span style={{ fontSize: '.85rem', color: '#dc2626', marginLeft: '.3rem', fontWeight: 700 }}>MXN</span></>
            : '✓'}
          sub={stats.overdueDate ? `⚠ Vence: ${stats.overdueDate}` : null}
          subColor="#dc2626"
          linkLabel={stats.overdueAmount > 0 ? 'Pagar' : null}
          linkTo="/client/payments"
          danger={stats.overdueAmount > 0}
        />
      </div>

      {/* ── Main 2-col grid ── */}
      <div className="cd-dash-grid">

        {/* LEFT: Seguimiento de Pedidos */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>Seguimiento de Pedidos</h2>
            <Link to="/client/orders" style={{ display: 'flex', alignItems: 'center', gap: '.2rem', color: '#2563eb', fontSize: '.82rem', fontWeight: 600, textDecoration: 'none' }}>
              Ver todos <ChevronRight size={13} />
            </Link>
          </div>

          {loading && <div className="cd-empty"><p className="cd-empty-text">Cargando...</p></div>}

          {!loading && recentOrders.length === 0 && (
            <div className="cd-empty">
              <div className="cd-empty-icon"><Package size={22} /></div>
              <p className="cd-empty-text">Aún no tienes pedidos activos.</p>
            </div>
          )}

          {recentOrders.map(order => {
            const { label: statusLabel, badge } = STATUS_MAP[order.status] || { label: order.status, badge: 'gray' };
            return (
              <Link key={order.id} to={`/client/orders/${order.id}`} className="cd-dash-order-card">
                {/* Row 1: number + badge */}
                <div className="cd-dash-order-head">
                  <div>
                    <span className="cd-dash-order-number">{order.orderNumber}</span>
                    <span className="cd-dash-order-name">{order.productName}</span>
                  </div>
                  <span className={`cd-badge ${badge} no-dot`}>{statusLabel}</span>
                </div>

                {/* Mini stepper */}
                <MiniStepper phases={order.phases} />

                {/* Row 3: delivery + amount */}
                <div className="cd-dash-order-foot">
                  <span className="cd-dash-order-date">
                    Entrega estimada: {order.deliveryDate
                      ? new Date(order.deliveryDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </span>
                  <span className="cd-dash-order-amount">${(order.clientAmount || 0).toLocaleString()} MXN</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* RIGHT: Sidebar */}
        <div>

          {/* Cotizaciones Listas */}
          <div className="cd-dash-sidebar-card">
            <div className="cd-dash-sidebar-head">
              <span style={{ fontSize: '.95rem', fontWeight: 700, color: 'var(--text)' }}>Cotizaciones Listas</span>
              {readyRFQs.length > 0 && <span className="cd-dash-badge-count">{readyRFQs.length}</span>}
            </div>
            {loading && <p style={{ color: 'var(--text-muted)', fontSize: '.82rem', padding: '.5rem 0' }}>Cargando...</p>}
            {!loading && readyRFQs.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '.82rem', padding: '.5rem 0' }}>No hay cotizaciones pendientes.</p>
            )}
            {readyRFQs.map(rfq => (
              <Link key={rfq.id} to="/client/rfqs" className="cd-dash-rfq-row">
                <div className="cd-dash-rfq-icon"><FileText size={14} /></div>
                <div className="cd-dash-rfq-info">
                  <div className="cd-dash-rfq-number">{rfq.rfqNumber}</div>
                  <div className="cd-dash-rfq-name">{rfq.productName}</div>
                </div>
                <div className="cd-dash-rfq-right">
                  <span className="cd-dash-rfq-opts">{rfq.quotesCount} opciones</span>
                  <ChevronRight size={13} style={{ color: '#94a3b8' }} />
                </div>
              </Link>
            ))}
          </div>

          {/* Acciones Rápidas */}
          <div className="cd-dash-sidebar-card">
            <div className="cd-dash-sidebar-head">
              <span style={{ fontSize: '.95rem', fontWeight: 700, color: 'var(--text)' }}>Acciones Rápidas</span>
            </div>
            {[
              { icon: <Plus size={15} style={{ color: '#2563eb' }} />, label: 'Crear Nueva Solicitud de Pedido', to: '/client/rfqs' },
              { icon: <MessageCircle size={15} style={{ color: '#7c3aed' }} />, label: 'Contactar a mi Gestor', to: '/client/messages' },
              { icon: <CreditCard size={15} style={{ color: '#16a34a' }} />, label: 'Ver Historial de Pagos', to: '/client/payments' },
            ].map(({ icon, label, to }) => (
              <Link key={label} to={to} className="cd-dash-action-row">
                <span className="cd-dash-action-icon">{icon}</span>
                <span className="cd-dash-action-label">{label}</span>
                <ChevronRight size={14} style={{ color: '#94a3b8' }} />
              </Link>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
