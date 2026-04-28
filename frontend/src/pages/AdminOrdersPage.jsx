import { useEffect, useState } from 'react';
import { adminApi } from '../api/api';
import AdminLayout from '../components/AdminLayout';

const ORDER_STATUSES = ['PENDING', 'APPROVED', 'SHIPPED', 'DELIVERED'];

const STATUS_LABELS = {
  PENDING:   'Pendiente',
  APPROVED:  'Aprobado',
  SHIPPED:   'Enviado',
  DELIVERED: 'Entregado',
};

/**
 * Página de gestión de pedidos (solo ADMIN).
 * Permite:
 *  - Ver todos los pedidos con cliente, total e items.
 *  - Cambiar el estado de cualquier pedido.
 */
const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // { [orderId]: boolean }
  const [processing, setProcessing] = useState({});
  // Controla qué fila tiene el detalle expandido
  const [expanded, setExpanded] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminApi.getAllOrders();
      setOrders(data.data);
    } catch {
      setError('No se pudieron cargar los pedidos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

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
    <AdminLayout>
      <div className="page-header">
        <h2>Gestión de Pedidos</h2>
        <span className="status-count">{orders.length} pedidos</span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="status-msg">Cargando pedidos...</p>}

      {!loading && orders.length > 0 && (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Cambiar Estado</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <>
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>
                      <span className="user-name">{order.client?.name}</span>
                      <br />
                      <span className="td-email">{order.client?.email}</span>
                    </td>
                    <td className="td-price">${order.totalAmount.toFixed(2)}</td>

                    {/* ── Estado actual ── */}
                    <td>
                      <span className={`status-pill status-${order.status.toLowerCase()}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>

                    <td className="td-date">
                      {new Date(order.createdAt).toLocaleDateString('es-MX', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>

                    {/* ── Selector de estado ── */}
                    <td>
                      <select
                        className="inline-select"
                        value={order.status}
                        disabled={processing[order.id]}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>

                    {/* ── Toggle detalle de items ── */}
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => toggleExpand(order.id)}
                      >
                        {expanded === order.id ? 'Ocultar' : `Ver (${order.orderItems?.length})`}
                      </button>
                    </td>
                  </tr>

                  {/* ── Fila expandible con detalle de items ── */}
                  {expanded === order.id && (
                    <tr key={`${order.id}-items`} className="expanded-row">
                      <td colSpan={7}>
                        <div className="items-detail">
                          <strong>Productos en este pedido:</strong>
                          <ul className="items-list">
                            {order.orderItems?.map((item) => (
                              <li key={item.id}>
                                {item.product?.name} — Cantidad: {item.quantity} — Precio unitario: ${item.unitPrice.toFixed(2)} — Subtotal: ${(item.quantity * item.unitPrice).toFixed(2)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && orders.length === 0 && (
        <p className="status-msg">No hay pedidos registrados.</p>
      )}
    </AdminLayout>
  );
};

export default AdminOrdersPage;
