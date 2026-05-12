import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../../api/api';
import StatusBadge from '../components/StatusBadge';
import { Search, AlertTriangle, Send } from 'lucide-react';
import '../admin-applications.css'; // Reusing the same layout styles

const AdminRFQsPage = () => {
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadRFQs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminApi.getAllRFQs();
      setRfqs(data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar las cotizaciones (RFQs).');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRFQs(); }, [loadRFQs]);

  const handleNotifyScouters = async (rfqId) => {
    try {
      await adminApi.notifyScouters(rfqId);
      alert(`Scouters notificados exitosamente para la cotización RFQ-${rfqId}`);
      loadRFQs(); // Actualizar la lista para reflejar el cambio de estado (SEARCHING)
    } catch (err) {
      alert('Error al notificar scouters');
    }
  };

  const fmt = (iso) => new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  // Compute stats for the dashboard feel
  const pendingReviewCount = rfqs.reduce((count, rfq) => {
    const hasPendingQuotes = rfq.quotes?.some(q => q.adminStatus === 'PENDING_REVIEW');
    return hasPendingQuotes ? count + 1 : count;
  }, 0);

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div className="aa-page-header">
        <div>
          <h1 className="aa-page-title">Cotizaciones (RFQs)</h1>
          <p className="aa-page-subtitle">Gatekeeper: Revisa las propuestas de los proveedores antes de liberarlas al cliente.</p>
        </div>
        <button className="aa-btn aa-btn-ghost aa-btn-sm" onClick={loadRFQs}>
          ↺ Actualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--surface)', padding: '1rem 1.5rem', borderRadius: 'var(--radius)', border: '1.5px solid var(--border)', flex: 1 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total RFQs</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text)' }}>{rfqs.length}</div>
        </div>
        <div style={{ background: 'var(--warning-bg)', padding: '1rem 1.5rem', borderRadius: 'var(--radius)', border: '1.5px solid rgba(217,119,6,0.2)', flex: 1 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Requieren Revisión Admin</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--warning)' }}>{pendingReviewCount}</div>
        </div>
      </div>

      {error && <div className="aa-error-box">{error}</div>}

      {/* Table */}
      <div className="aa-table-wrapper">
        {loading ? (
          <div className="aa-loading"><span className="aa-spinner" /> Cargando RFQs...</div>
        ) : (
          <table className="aa-table">
            <thead>
              <tr>
                <th>RFQ #</th>
                <th>Cliente</th>
                <th>Producto (Categoría)</th>
                <th>Estado</th>
                <th>Propuestas</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {rfqs.length === 0 ? (
                <tr><td colSpan="6" className="aa-table-empty">No hay RFQs registrados.</td></tr>
              ) : (
                rfqs.map(rfq => {
                  const pendingCount = rfq.quotes?.filter(q => q.adminStatus === 'PENDING_REVIEW').length || 0;
                  const hoursSince = Math.floor((new Date() - new Date(rfq.createdAt)) / (1000 * 60 * 60));
                  const isStagnant = rfq.status === 'PENDING' && rfq.quotes?.length === 0 && hoursSince > 48;
                  
                  return (
                    <tr key={rfq.id} onClick={() => navigate(`/admin/rfqs/${rfq.id}`)}>
                      <td style={{ fontWeight: '700', color: 'var(--accent)' }}>{rfq.rfqNumber}</td>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--text)' }}>{rfq.client?.name}</div>
                        <div className="aa-table-sub">{rfq.client?.companyName}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--text)' }}>{rfq.title}</div>
                        <div className="aa-table-sub" style={{ textTransform: 'capitalize' }}>{rfq.category} • {rfq.quantity} {rfq.unit}</div>
                      </td>
                      <td><StatusBadge status={rfq.status} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ fontWeight: '600' }}>{rfq.quotes?.length || 0} recibidas</span>
                          {pendingCount > 0 && (
                            <span style={{ background: 'var(--warning)', color: '#fff', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '10px', fontWeight: 'bold' }}>
                              {pendingCount} por revisar
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {isStagnant ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <AlertTriangle size={12} /> ESTANCADA ({hoursSince}h)
                            </span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleNotifyScouters(rfq.id); }}
                              style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Send size={10} /> Notificar Scouter
                            </button>
                          </div>
                        ) : (
                          <span className="aa-table-date">{fmt(rfq.createdAt)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
};

export default AdminRFQsPage;
