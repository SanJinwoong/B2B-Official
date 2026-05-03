import { useEffect, useState } from 'react';
import { FileText, DollarSign, ChevronDown, ChevronUp, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { supplierOpportunitiesApi } from '../../../api/api';

export default function SupplierOpportunitiesPage() {
  const [rfqs, setRFQs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState({});
  const [quoteForms, setQuoteForms] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const load = () => {
    setLoading(true);
    supplierOpportunitiesApi.getOpportunities()
      .then(res => setRFQs(res.data?.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggle = (id) => setOpen(p => ({ ...p, [id]: !p[id] }));

  const handleFormChange = (rfqId, field, value) => {
    setQuoteForms(p => ({
      ...p,
      [rfqId]: { ...p[rfqId], [field]: value }
    }));
  };

  const submitQuote = async (e, rfqId) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = quoteForms[rfqId];
      if (!data?.unitPrice || !data?.totalPrice || !data?.deliveryDays || !data?.moq) {
        showToast("Llena todos los campos obligatorios", 'error');
        setSubmitting(false);
        return;
      }
      await supplierOpportunitiesApi.submitQuote(rfqId, data);
      showToast("¡Cotización enviada exitosamente!");
      load();
    } catch (err) {
      showToast(err.response?.data?.error?.message || err.response?.data?.message || 'Error al enviar cotización', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const fmtShort = d => new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

  return (
    <div className="sp-page fade-in">
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Oportunidades de Negocio (RFQs)</h1>
          <p className="sp-page-sub">Encuentra clientes buscando tus productos y envía tus cotizaciones</p>
        </div>
      </div>

      {toast.show && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? 'var(--error)' : '#10b981', color: '#fff',
          padding: '12px 24px', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: 10,
          fontSize: '.9rem', fontWeight: 600, zIndex: 3000, boxShadow: '0 8px 24px rgba(0,0,0,.3)',
          animation: 'sp-toast-in 0.3s ease'
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}

      {loading ? (
        <div className="sp-empty">Cargando oportunidades...</div>
      ) : rfqs.length === 0 ? (
        <div className="sp-empty">
          <FileText size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <p>No hay solicitudes disponibles en tu categoría en este momento.</p>
        </div>
      ) : (
        <div className="sp-grid">
          {rfqs.map(rfq => {
            const isOpen = !!open[rfq.id];
            return (
              <div key={rfq.id} className="sp-card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Header Toggle */}
                <div 
                  style={{ padding: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: isOpen ? '1px solid var(--border)' : 'none' }}
                  onClick={() => toggle(rfq.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-blue)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={20} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{rfq.title}</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', background: 'var(--bg-orange)', color: 'var(--orange)', borderRadius: 12, fontWeight: 500 }}>
                          Esperando cotizaciones
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                        {rfq.clientAlias} · {rfq.quantity.toLocaleString()} {rfq.unit} · Solicitado el {fmtShort(rfq.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Expanded content */}
                {isOpen && (
                  <div style={{ padding: '20px', background: 'var(--surface-hover)' }}>
                    
                    {/* RFQ Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>DESCRIPCIÓN Y ESPECIFICACIONES</div>
                        <p style={{ fontSize: 14, color: 'var(--text)', whiteSpace: 'pre-wrap', margin: 0 }}>{rfq.description || 'Sin descripción adicional'}</p>
                      </div>
                      <div>
                        {rfq.images && rfq.images.length > 0 && (
                          <>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>PLANOS / IMÁGENES</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {rfq.images.map((img, i) => (
                                <a key={i} href={img} target="_blank" rel="noreferrer" style={{ width: 60, height: 60, borderRadius: 6, border: '1px solid var(--border)', overflow: 'hidden', display: 'block' }}>
                                  <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="referencia" />
                                </a>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Quote Form */}
                    <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <DollarSign size={16} color="var(--primary)" />
                        Enviar Propuesta Comercial
                      </h3>
                      
                      <form onSubmit={(e) => submitQuote(e, rfq.id)}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>Precio Unitario (MXN) *</label>
                            <input 
                              type="number" required step="0.01" min="0"
                              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                              placeholder="Ej. 15.50"
                              value={quoteForms[rfq.id]?.unitPrice || ''}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                handleFormChange(rfq.id, 'unitPrice', e.target.value);
                                handleFormChange(rfq.id, 'totalPrice', (val * rfq.quantity).toFixed(2));
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>Precio Total (MXN) *</label>
                            <input 
                              type="number" required step="0.01" min="0"
                              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-blue)', color: 'var(--primary)', fontWeight: 600 }}
                              value={quoteForms[rfq.id]?.totalPrice || ''}
                              readOnly
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>Tiempo de Entrega (Días) *</label>
                            <input 
                              type="number" required min="1"
                              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                              placeholder="Ej. 15"
                              value={quoteForms[rfq.id]?.deliveryDays || ''}
                              onChange={e => handleFormChange(rfq.id, 'deliveryDays', e.target.value)}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 20 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>MOQ (Pedido Mínimo) *</label>
                            <input 
                              type="number" required min="1"
                              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                              placeholder={`Ej. ${rfq.quantity}`}
                              value={quoteForms[rfq.id]?.moq || ''}
                              onChange={e => handleFormChange(rfq.id, 'moq', e.target.value)}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>Términos y Condiciones / Notas</label>
                            <input 
                              type="text"
                              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                              placeholder="Ej. Precio incluye envío terrestre. 50% anticipo."
                              value={quoteForms[rfq.id]?.notes || ''}
                              onChange={e => handleFormChange(rfq.id, 'notes', e.target.value)}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button 
                            type="submit" 
                            disabled={submitting}
                            style={{ 
                              display: 'flex', alignItems: 'center', gap: 8, 
                              background: 'var(--primary)', color: 'white', 
                              padding: '10px 24px', borderRadius: 8, border: 'none', 
                              fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer',
                              opacity: submitting ? 0.7 : 1
                            }}
                          >
                            <Send size={16} />
                            {submitting ? 'Enviando...' : 'Enviar Cotización'}
                          </button>
                        </div>
                      </form>

                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
