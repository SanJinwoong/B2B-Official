import React, { useEffect, useState } from 'react';
import { adminApi } from '../../../api/api';
import { DollarSign, ArrowUpRight, ArrowDownRight, CheckCircle, Clock, FileText } from 'lucide-react';
import '../admin-applications.css';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export default function AdminFinancesPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getAllPayments(); // Ensure we have this in api.js
      setPayments(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleStatusChange = async (id, status) => {
    if (!window.confirm(`¿Marcar este pago como ${status}?`)) return;
    setUpdating(id);
    try {
      await adminApi.updatePaymentStatus(id, { status }); // Ensure we have this in api.js
      await fetchPayments();
    } catch (err) {
      alert('Error al actualizar el pago');
    } finally {
      setUpdating(null);
    }
  };

  // Cálculos rápidos
  const totalInbound = payments.filter(p => p.direction === 'INBOUND' && p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0);
  const totalOutbound = payments.filter(p => p.direction === 'OUTBOUND' && p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0);
  const pendingInbound = payments.filter(p => p.direction === 'INBOUND' && p.status !== 'PAID').reduce((sum, p) => sum + p.amount, 0);
  const pendingOutbound = payments.filter(p => p.direction === 'OUTBOUND' && p.status !== 'PAID').reduce((sum, p) => sum + p.amount, 0);

  const retainedMargin = totalInbound - totalOutbound;

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="aa-page-header">
        <div>
          <h1 className="aa-page-title">Dashboard Financiero B2B</h1>
          <p className="aa-page-subtitle">Control de Pagos Recibidos (Clientes) y Dispersiones (Proveedores)</p>
        </div>
        <button className="aa-btn aa-btn-ghost" onClick={fetchPayments}>↺ Actualizar</button>
      </div>

      {/* ─── Kpis ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>
            <ArrowDownRight size={18} color="#16a34a" /> Pagos Recibidos (Inbound)
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>{fmt(totalInbound)}</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Pendiente de cobro: {fmt(pendingInbound)}</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>
            <ArrowUpRight size={18} color="#dc2626" /> Pagos Dispersados (Outbound)
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>{fmt(totalOutbound)}</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Pendiente de pago: {fmt(pendingOutbound)}</div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', borderRadius: '12px', padding: '20px', color: '#fff', boxShadow: '0 10px 20px rgba(37, 99, 235, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', opacity: 0.9 }}>
            <DollarSign size={18} /> Margen Retenido (Estimado)
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{fmt(retainedMargin)}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '4px' }}>Diferencia Inbound vs Outbound</div>
        </div>
      </div>

      {/* ─── Tabla de Transacciones ─── */}
      <div className="aa-table-wrapper">
        <table className="aa-table">
          <thead>
            <tr>
              <th>ID/Tipo</th>
              <th>Orden Asociada</th>
              <th>Dirección</th>
              <th>Monto</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="aa-loading">Cargando transacciones...</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={6} className="aa-table-empty">No hay pagos registrados aún.</td></tr>
            ) : (
              payments.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>PAG-{p.id}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.type} ({p.percentage}%)</div>
                  </td>
                  <td>
                    <a href={`/admin/orders`} style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>
                      {p.order?.orderNumber || `ORD-${p.orderId}`}
                    </a>
                    {p.direction === 'INBOUND' && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>De: {p.order?.client?.name}</div>
                    )}
                    {p.direction === 'OUTBOUND' && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Para: {p.order?.supplier?.name}</div>
                    )}
                  </td>
                  <td>
                    {p.direction === 'INBOUND' ? (
                      <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <ArrowDownRight size={12}/> Entrada
                      </span>
                    ) : (
                      <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <ArrowUpRight size={12}/> Salida
                      </span>
                    )}
                  </td>
                  <td style={{ fontWeight: 800, color: '#0f172a' }}>
                    {fmt(p.amount)}
                  </td>
                  <td>
                    {p.status === 'PAID' ? (
                      <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}><CheckCircle size={14}/> Pagado</span>
                    ) : (
                      <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}><Clock size={14}/> {p.status}</span>
                    )}
                  </td>
                  <td>
                    {p.status !== 'PAID' && (
                      <button 
                        className="aa-btn aa-btn-sm" 
                        disabled={updating === p.id}
                        onClick={() => handleStatusChange(p.id, 'PAID')}
                      >
                        {updating === p.id ? '...' : 'Marcar Pagado'}
                      </button>
                    )}
                    {p.status === 'PAID' && (
                      <button 
                        className="aa-btn aa-btn-ghost aa-btn-sm" 
                        onClick={() => handleStatusChange(p.id, 'PENDING')}
                      >
                        Deshacer
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
