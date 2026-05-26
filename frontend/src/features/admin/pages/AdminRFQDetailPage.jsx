import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi, adminConfigApi } from '../../../api/api';
import StatusBadge from '../components/StatusBadge';
import { ArrowLeft, Check, X } from 'lucide-react';
import '../admin-applications.css';

const AdminRFQDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [marginPct, setMarginPct] = useState(15);
  const [editQuoteData, setEditQuoteData] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rfqRes, configRes] = await Promise.all([
        adminApi.getRFQById(id),
        adminConfigApi.getAdminConfig()
      ]);
      setRfq(rfqRes.data.data);
      setMarginPct(configRes.data.marginPercentage || 15);
    } catch (err) {
      setError('Error al cargar la información.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleForward = async (quoteId) => {
    try {
      const updates = editQuoteData[quoteId] || {};
      await adminApi.forwardQuote(quoteId, updates);
      loadData(); // refresh
    } catch (err) {
      alert('Error al liberar la cotización.');
    }
  };

  const handleEditChange = (quoteId, field, value) => {
    setEditQuoteData(prev => ({
      ...prev,
      [quoteId]: {
        ...prev[quoteId],
        [field]: Number(value)
      }
    }));
  };

  const handleReject = async (quoteId) => {
    if (!window.confirm('¿Seguro que deseas rechazar esta cotización? El cliente no la verá.')) return;
    try {
      await adminApi.rejectQuote(quoteId);
      loadData();
    } catch (err) {
      alert('Error al rechazar.');
    }
  };

  if (loading) return <div className="aa-loading"><span className="aa-spinner" /> Cargando RFQ...</div>;
  if (error || !rfq) return <div className="aa-error-box">{error || 'RFQ no encontrado'}</div>;

  const fmtCurrency = (val) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      <button className="aa-back-btn" onClick={() => navigate('/admin/rfqs')}>
        <ArrowLeft size={16} /> Volver a lista de RFQs
      </button>

      <div className="aa-page-header" style={{ marginBottom: '1rem' }}>
        <div>
          <h1 className="aa-page-title">{rfq.title}</h1>
          <p className="aa-page-subtitle">{rfq.rfqNumber} • Creado el {new Date(rfq.createdAt).toLocaleDateString()}</p>
        </div>
        <StatusBadge status={rfq.status} />
      </div>

      <div className="aa-section">
        <h3 className="aa-section-title">Información del Cliente</h3>
        <div className="aa-info-grid">
          <div className="aa-info-item">
            <label>Empresa</label>
            <p>{rfq.client?.companyName || '—'}</p>
          </div>
          <div className="aa-info-item">
            <label>Contacto</label>
            <p>{rfq.client?.name} ({rfq.client?.email})</p>
          </div>
          <div className="aa-info-item">
            <label>Teléfono</label>
            <p>{rfq.client?.phone || '—'}</p>
          </div>
          <div className="aa-info-item">
            <label>Requerimiento</label>
            <p>{rfq.quantity} {rfq.unit} • Presupuesto: {rfq.budget ? fmtCurrency(rfq.budget) : 'Abierto'}</p>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.2rem', fontWeight: '800', marginTop: '2rem', marginBottom: '1rem', color: 'var(--text)' }}>
        Propuestas de Proveedores
      </h2>

      {rfq.quotes?.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1.5px dashed var(--border)' }}>
          <p style={{ color: 'var(--text-muted)' }}>Ningún proveedor ha enviado propuestas aún.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {rfq.quotes.map(quote => {
            
            const isPending = quote.adminStatus === 'PENDING_REVIEW';
            const isForwarded = quote.adminStatus === 'FORWARDED';
            const isRejected = quote.adminStatus === 'REJECTED';

            // Precios que cobrará la plataforma
            const currentClientTotal = quote.totalPrice * (1 + marginPct / 100);
            const currentClientUnit = quote.unitPrice * (1 + marginPct / 100);
            
            return (
              <div key={quote.id} style={{ 
                background: 'var(--surface)', 
                border: `1.5px solid ${isForwarded ? 'var(--success)' : isRejected ? 'var(--error)' : 'var(--accent)'}`,
                borderRadius: 'var(--radius)', 
                padding: '1.5rem',
                opacity: isRejected ? 0.6 : 1
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text)' }}>{quote.supplierName}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-subtle)' }}>Días de entrega: {quote.deliveryDays} • MOQ: {quote.moq}</div>
                  </div>
                  <div>
                    {isPending && <span style={{ background: 'var(--warning-bg)', color: 'var(--warning)', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>PENDIENTE DE REVISIÓN</span>}
                    {isForwarded && <span style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>LIBERADA AL CLIENTE</span>}
                    {isRejected && <span style={{ background: 'var(--error-bg)', color: 'var(--error)', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>RECHAZADA</span>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--bg)', padding: '1rem', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Costo del Proveedor</div>
                    {isPending ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '0.8rem', width: '60px', color: 'var(--text-subtle)', fontWeight: 600 }}>Total:</span>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ position: 'absolute', left: '10px', color: 'var(--text-subtle)', fontSize: '0.9rem', fontWeight: 600 }}>$</span>
                            <input type="number" className="aa-input" style={{ padding: '0.4rem 0.6rem 0.4rem 22px', width: '130px', fontSize: '0.95rem', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc' }} 
                              value={editQuoteData[quote.id]?.totalPrice ?? quote.totalPrice} 
                              onChange={e => handleEditChange(quote.id, 'totalPrice', e.target.value)} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '0.8rem', width: '60px', color: 'var(--text-subtle)', fontWeight: 600 }}>Unitario:</span>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ position: 'absolute', left: '10px', color: 'var(--text-subtle)', fontSize: '0.9rem', fontWeight: 600 }}>$</span>
                            <input type="number" className="aa-input" style={{ padding: '0.4rem 0.6rem 0.4rem 22px', width: '130px', fontSize: '0.95rem', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc' }} 
                              value={editQuoteData[quote.id]?.unitPrice ?? quote.unitPrice} 
                              onChange={e => handleEditChange(quote.id, 'unitPrice', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{fmtCurrency(quote.totalPrice)}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>{fmtCurrency(quote.unitPrice)} / {rfq.unit}</div>
                      </>
                    )}
                  </div>
                  
                  {!isRejected && (
                    <div style={{ borderLeft: '2px solid var(--border)', paddingLeft: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                        Precio al Cliente 
                        <span style={{ color: 'var(--text-subtle)', fontWeight: 'normal' }}>(+ Margen {marginPct}%)</span>
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text)' }}>
                        {fmtCurrency(
                          (editQuoteData[quote.id]?.totalPrice ?? quote.totalPrice) * (1 + marginPct / 100)
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                        {fmtCurrency(
                          (editQuoteData[quote.id]?.unitPrice ?? quote.unitPrice) * (1 + marginPct / 100)
                        )} / {rfq.unit}
                      </div>
                    </div>
                  )}
                </div>

                {isPending && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                    <button className="aa-btn aa-btn-ghost aa-btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleReject(quote.id)}>
                      <X size={14} /> Rechazar
                    </button>
                    <button className="aa-btn aa-btn-success aa-btn-sm" onClick={() => handleForward(quote.id)}>
                      <Check size={14} /> Aprobar (Liberar)
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminRFQDetailPage;
