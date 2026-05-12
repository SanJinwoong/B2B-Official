import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../api/api';
import '../features/admin/admin-applications.css';
import OrderDataRoom from '../components/OrderDataRoom';

const ALL_STATUSES = [
  'PENDING', 'IN_PRODUCTION', 'QUALITY_CONTROL', 'IN_TRANSIT',
  'DELIVERED', 'CANCELLED', 'APPROVED', 'SHIPPED',
];

const STATUS_LABELS = {
  PENDING:         'Pendiente',
  IN_PRODUCTION:   'En Producción',
  QUALITY_CONTROL: 'Control Calidad',
  IN_TRANSIT:      'En Tránsito',
  DELIVERED:       'Entregado',
  CANCELLED:       'Cancelado',
  APPROVED:        'Aprobado',
  SHIPPED:         'Enviado',
};

const STATUS_COLORS = {
  PENDING:         { bg: '#fef9c3', color: '#854d0e' },
  IN_PRODUCTION:   { bg: '#dbeafe', color: '#1e40af' },
  QUALITY_CONTROL: { bg: '#ede9fe', color: '#5b21b6' },
  IN_TRANSIT:      { bg: '#e0f2fe', color: '#0369a1' },
  DELIVERED:       { bg: '#dcfce7', color: '#15803d' },
  CANCELLED:       { bg: '#fee2e2', color: '#b91c1c' },
  APPROVED:        { bg: '#dcfce7', color: '#15803d' },
  SHIPPED:         { bg: '#e0f2fe', color: '#0369a1' },
};

const fmtDate = (iso) => new Date(iso).toLocaleDateString('es-MX', {
  day: '2-digit', month: 'short', year: 'numeric',
});

const AdminOrdersPage = () => {
  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [processing, setProcessing] = useState({});
  const [expanded,   setExpanded]   = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminApi.getAllOrders();
      setOrders(data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar los pedidos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleStatusChange = async (orderId, status) => {
    setProcessing((p) => ({ ...p, [orderId]: true }));
    try {
      await adminApi.updateOrderStatus(orderId, status);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Error al cambiar el estado.');
    } finally {
      setProcessing((p) => ({ ...p, [orderId]: false }));
    }
  };

  const toggleExpand = (id) =>
    setExpanded((prev) => (prev === id ? null : id));

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div className="aa-page-header">
        <div>
          <h1 className="aa-page-title">Gestión de Pedidos</h1>
          <p className="aa-page-subtitle">Monitorea y actualiza el estado de todos los pedidos de la plataforma.</p>
        </div>
        <button className="aa-btn aa-btn-ghost aa-btn-sm" onClick={fetchOrders}>
          ↺ Actualizar
        </button>
      </div>

      {error && <div className="aa-error-box">{error}</div>}

      <div className="aa-table-wrapper">
        {loading ? (
          <div className="aa-loading">
            <span className="aa-spinner" /> Cargando pedidos...
          </div>
        ) : (
          <table className="aa-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Total Cliente</th>
                <th>Estado Actual</th>
                <th>Fecha</th>
                <th>Cambiar Estado</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="aa-table-empty">
                    No hay pedidos registrados aún.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const statusStyle = STATUS_COLORS[order.status] || { bg: '#f3f4f6', color: '#374151' };
                  const isExpanded  = expanded === order.id;

                  return [
                    <tr key={order.id}>
                      <td style={{ fontWeight: '700', color: 'var(--accent)' }}>
                        #{order.id}
                        {order.orderNumber && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', fontWeight: 400 }}>
                            {order.orderNumber}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--text)' }}>{order.client?.name || '—'}</div>
                        <div className="aa-table-sub">{order.client?.email}</div>
                      </td>
                      <td style={{ fontWeight: '700' }}>
                        ${order.clientAmount?.toFixed(2) ?? order.totalAmount?.toFixed(2) ?? '—'}
                        {order.supplierAmount != null && order.supplierAmount !== order.totalAmount && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', fontWeight: 400 }}>
                            Proveedor: ${order.supplierAmount.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.65rem',
                          borderRadius: '99px',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          background: statusStyle.bg,
                          color: statusStyle.color,
                        }}>
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </td>
                      <td className="aa-table-date">{fmtDate(order.createdAt)}</td>
                      <td>
                        <select
                          className="aa-filter-select"
                          value={order.status}
                          disabled={processing[order.id]}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem' }}
                        >
                          {ALL_STATUSES.map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          className="aa-btn aa-btn-ghost aa-btn-xs"
                          onClick={() => toggleExpand(order.id)}
                        >
                          {isExpanded ? 'Ocultar' : `Ver (${order.orderItems?.length ?? 0})`}
                        </button>
                      </td>
                    </tr>,

                    isExpanded && (
                      <tr key={`${order.id}-items`} style={{ background: 'var(--surface-2)' }}>
                        <td colSpan={7} style={{ padding: '1rem 1.25rem' }}>
                          {order.orderItems?.length > 0 ? (
                            <div>
                              <div style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: '0.5rem' }}>
                                Productos del pedido
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                {order.orderItems.map((item) => (
                                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.4rem 0.75rem', background: 'var(--surface)', borderRadius: '6px' }}>
                                    <span style={{ fontWeight: '600' }}>{item.product?.name || `Producto #${item.productId}`}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>
                                      {item.quantity} × ${item.unitPrice?.toFixed(2)} = <strong>${(item.quantity * item.unitPrice).toFixed(2)}</strong>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                              Este pedido proviene de una cotización (RFQ) — no tiene items individuales de marketplace.
                            </span>
                          )}
                          
                          <div style={{ marginTop: '20px' }}>
                            <OrderDataRoom orderId={order.id} currentUserRole="ADMIN" />
                          </div>
                        </td>
                      </tr>
                    ),
                  ];
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminOrdersPage;
