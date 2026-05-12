import { useEffect, useState } from 'react';
import { FileText, DollarSign, ChevronDown, ChevronUp, Send, CheckCircle, AlertCircle, Package, Calendar } from 'lucide-react';
import { supplierOpportunitiesApi } from '../../../api/api';

export default function SupplierOpportunitiesPage() {
  const [rfqs, setRFQs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState({});
  const [quoteForms, setQuoteForms] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [sortBy, setSortBy] = useState('recent');
  const [tab, setTab] = useState('new'); // 'new' | 'sent'

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

  const toggle = (id) => setOpen(p => (p[id] ? {} : { [id]: true }));

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
      if (!data?.unitPrice || !data?.totalPrice || !data?.deliveryDays || !data?.moq || data?.samplePrice === undefined || data?.samplePrice === '') {
        showToast("Llena todos los campos obligatorios, incluyendo el costo de la muestra", 'error');
        setSubmitting(false);
        return;
      }

      const rfq = rfqs.find(r => r.id === rfqId);
      if (rfq && rfq.budget && !rfq.isNegotiable) {
        if (parseFloat(data.totalPrice) > rfq.budget) {
          showToast(`El precio total no puede superar el presupuesto máximo de $${rfq.budget.toLocaleString()} MXN (No negociable)`, 'error');
          setSubmitting(false);
          return;
        }
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
          <p>No hay solicitudes disponibles en este momento.</p>
        </div>
      ) : (
        <>
          {/* ── Tabs: Nuevas vs Enviadas ── */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid var(--border)' }}>
            <button 
              onClick={() => setTab('new')}
              style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: tab === 'new' ? '2px solid var(--primary)' : '2px solid transparent', color: tab === 'new' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}
            >
              Nuevas Oportunidades
            </button>
            <button 
              onClick={() => setTab('sent')}
              style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: tab === 'sent' ? '2px solid var(--primary)' : '2px solid transparent', color: tab === 'sent' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}
            >
              Propuestas Enviadas
            </button>
          </div>

          {/* ── Filters & Sort ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {['Todas', 'general', 'empaques', 'manufactura', 'alimentos', 'textiles', 'logistica', 'quimicos', 'electronica', 'construccion', 'otros'].map(f => (
                <button
                  key={f}
                  style={{
                    padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--border)', 
                    background: filterCategory === f ? '#2563eb' : 'var(--surface)', 
                    color: filterCategory === f ? '#fff' : 'var(--text-muted)', 
                    fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s'
                  }}
                  onClick={() => setFilterCategory(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div>
              <select 
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.85rem' }}
                value={sortBy} 
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="recent">Más recientes</option>
                <option value="volume">Mayor volumen (Cantidad)</option>
              </select>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
            {(() => {
              const normalize = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : '';
              let processed = [...rfqs];
              
              if (tab === 'new') {
                processed = processed.filter(r => !r.hasQuoted && r.status !== 'COMPLETED' && r.status !== 'APPROVED' && r.status !== 'EXPIRED');
              } else {
                processed = processed.filter(r => r.hasQuoted);
              }

              if (filterCategory !== 'Todas') {
                processed = processed.filter(r => normalize(r.category).includes(normalize(filterCategory)));
              }
              
              processed.sort((a, b) => {
                if (sortBy === 'volume') return b.quantity - a.quantity;
                return new Date(b.createdAt) - new Date(a.createdAt);
              });

              if (processed.length === 0) return <div className="sp-empty" style={{ gridColumn: '1 / -1' }}>No se encontraron coincidencias para los filtros aplicados.</div>;

              return processed.map(rfq => {
                const isOpen = !!open[rfq.id];
                const isSent = tab === 'sent';
                
                let cardStyle = {
                  display: 'flex', 
                  flexDirection: isOpen ? 'row' : 'column', 
                  backgroundColor: '#fff', 
                  borderRadius: '16px', 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)', 
                  border: isOpen ? '2px solid #2563eb' : '2px solid transparent', 
                  transition: 'border 0.2s, box-shadow 0.2s, filter 0.2s, opacity 0.2s', 
                  gridColumn: isOpen ? '1 / -1' : 'auto',
                  overflow: 'hidden',
                  height: '100%' // Ensure stretching in grid
                };

                let statusBadge = null;

                if (isSent) {
                  const isClosed = rfq.status === 'COMPLETED' || rfq.status === 'APPROVED';
                  const won = isClosed && rfq.myQuote?.isApproved;
                  const lost = isClosed && !rfq.myQuote?.isApproved;

                  if (won) {
                    cardStyle.border = '2px solid #2563eb';
                    cardStyle.boxShadow = '0 0 15px rgba(37, 99, 235, 0.15)';
                    statusBadge = <div style={{ position: 'absolute', top: 12, right: 12, background: '#2563eb', color: '#fff', padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700, zIndex: 10 }}>¡Propuesta Ganadora!</div>;
                  } else if (lost) {
                    cardStyle.opacity = 0.6;
                    cardStyle.filter = 'grayscale(100%)';
                    cardStyle.backgroundColor = '#cbd5e1';
                    statusBadge = <div style={{ position: 'absolute', top: 12, right: 12, background: '#475569', color: '#fff', padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700, zIndex: 10 }}>Cerrada (No elegido)</div>;
                  } else {
                    cardStyle.opacity = 0.85;
                    cardStyle.backgroundColor = '#f1f5f9';
                    cardStyle.border = '1px solid #cbd5e1';
                    statusBadge = <div style={{ position: 'absolute', top: 12, right: 12, background: '#3b82f6', color: '#fff', padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700, zIndex: 10 }}>En revisión...</div>;
                  }
                }

                return (
                  <div key={rfq.id} style={cardStyle}>
                    
                    {/* Image Area */}
                    <div style={{ position: 'relative', height: isOpen ? '100%' : '180px', minHeight: isOpen ? '300px' : '180px', width: isOpen ? '400px' : '100%', backgroundColor: 'var(--bg-muted)', flexShrink: 0 }}>
                      {statusBadge}
                      {(() => {
                        let imgUrl = null;
                        try {
                          if (Array.isArray(rfq.images) && rfq.images.length > 0) imgUrl = rfq.images[0];
                          else if (typeof rfq.images === 'string') {
                            const parsed = JSON.parse(rfq.images);
                            if (Array.isArray(parsed) && parsed.length > 0) imgUrl = parsed[0];
                          }
                        } catch (e) {}
                        if (imgUrl) {
                          return <img src={imgUrl} alt="Referencia" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
                        }
                        return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><FileText size={32} opacity={0.5} /></div>;
                      })()}
                      
                      {/* HUGE Budget Badge at Top Left */}
                      {!isSent && rfq.budget && (
                        <div style={{ position: 'absolute', top: '12px', left: '12px', padding: '6px 14px', background: '#2563eb', color: '#fff', borderRadius: '24px', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <DollarSign size={18} strokeWidth={3} />
                          <div style={{ fontSize: '1.1rem', fontWeight: 900, lineHeight: 1 }}>{rfq.budget.toLocaleString()} <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>MXN</span></div>
                        </div>
                      )}
                      {!isSent && !rfq.budget && (
                        <div style={{ position: 'absolute', top: '12px', left: '12px', padding: '6px 12px', background: 'rgba(0,0,0,0.7)', color: '#fff', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
                           A negociar
                        </div>
                      )}

                      {/* Top-Right Ideal Category Badge */}
                      {!isSent && rfq.isMatchingCategory && (
                        <div style={{ position: 'absolute', top: '12px', right: '12px', padding: '6px 12px', background: '#dcfce7', color: '#16a34a', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                           IDEAL
                        </div>
                      )}
                    </div>

                    {/* Content Area (Description + Form if open) */}
                    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
                      
                      {/* Header & Description */}
                      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: isOpen ? 0 : 1 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                          {rfq.clientAlias} • Solicitado el {fmtShort(rfq.createdAt)}
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 8px 0', lineHeight: 1.3 }}>{rfq.title}</h3>
                        
                        {/* Quantity (Pieces) & Deadline */}
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px', color: 'var(--text)', fontWeight: 500, fontSize: '0.95rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Package size={16} color="var(--text-muted)" />
                            {rfq.quantity.toLocaleString()} {rfq.unit}
                          </div>
                          {rfq.deadline && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a' }}>
                              <Calendar size={16} color="var(--text-muted)" />
                              Espera recibir: {fmtShort(rfq.deadline)}
                            </div>
                          )}
                        </div>

                        {isOpen && rfq.budget && (
                          <div style={{ padding: '10px 12px', backgroundColor: rfq.isNegotiable ? '#eff6ff' : '#f8fafc', borderLeft: `4px solid ${rfq.isNegotiable ? '#2563eb' : '#64748b'}`, borderRadius: '4px', marginBottom: '12px', fontSize: '0.85rem', color: rfq.isNegotiable ? '#1e3a8a' : '#334155' }}>
                            <strong>Presupuesto máximo:</strong> ${rfq.budget.toLocaleString()} MXN
                            <br />
                            {rfq.isNegotiable ? '✓ El cliente está dispuesto a negociar el precio.' : '⚠ Precio no negociable. Tu propuesta debe ser menor o igual a este monto.'}
                          </div>
                        )}

                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: isOpen ? 'block' : '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5' }}>
                          {rfq.description || 'Sin descripción detallada.'}
                        </div>

                        {/* Footer Button (Only visible when NOT open and NOT sent) */}
                        {!isOpen && !isSent && (
                          <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                            <button 
                              onClick={() => toggle(rfq.id)} 
                              style={{ 
                                width: '100%', padding: '12px 16px', borderRadius: '8px', 
                                background: '#2563eb', color: '#fff', 
                                fontSize: '0.95rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                              }}
                            >
                              <Send size={18} />
                              Enviar Propuesta
                            </button>
                          </div>
                        )}

                        {/* Sent Info (If sent) */}
                        {!isOpen && isSent && (
                          <div style={{ marginTop: 'auto', paddingTop: '20px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                            Cotizaste: ${(rfq.myQuote?.totalPrice || 0).toLocaleString()} MXN
                          </div>
                        )}
                      </div>

                      {/* Expanded Form Area (Only visible when open) */}
                      {isOpen && !isSent && (
                        <div style={{ borderTop: '2px dashed var(--border)', background: 'var(--surface-hover)', padding: '24px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Send size={18} color="#2563eb" />
                            Formulario para enviar propuesta
                          </h3>
                          <div style={{ padding: '10px 14px', background: '#fef2f2', borderLeft: '4px solid #ef4444', borderRadius: '4px', marginBottom: '20px', fontSize: '0.85rem', color: '#991b1b' }}>
                            <strong>Política B2B:</strong> Es obligatorio enviar una muestra física al cliente para su aprobación antes de desbloquear la producción masiva del pedido. Indica el costo de la muestra a continuación (pon 0 si es gratis).
                          </div>
                          
                          <form onSubmit={(e) => submitQuote(e, rfq.id)} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
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
                                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: '#eff6ff', color: '#2563eb', fontWeight: 600 }}
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
                              <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#991b1b', marginBottom: 6 }}>Costo de Muestra Inicial (MXN) *</label>
                                <input 
                                  type="number" required step="0.01" min="0"
                                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2', color: '#991b1b', fontWeight: 600 }}
                                  placeholder="0 = Gratis"
                                  value={quoteForms[rfq.id]?.samplePrice || ''}
                                  onChange={e => handleFormChange(rfq.id, 'samplePrice', e.target.value)}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 24 }}>
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

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: 'auto' }}>
                              <button 
                                type="button"
                                onClick={() => toggle(rfq.id)}
                                style={{ 
                                  padding: '12px 24px', background: 'transparent', color: 'var(--text-muted)', 
                                  border: '1px solid var(--border)', borderRadius: 8, fontWeight: 600, cursor: 'pointer' 
                                }}
                              >
                                Cancelar
                              </button>
                              <button 
                                type="submit" 
                                disabled={submitting}
                                style={{ 
                                  display: 'flex', alignItems: 'center', gap: 8, 
                                  background: '#2563eb', color: 'white', 
                                  padding: '12px 28px', borderRadius: 8, border: 'none', 
                                  fontWeight: 600, fontSize: '0.95rem', cursor: submitting ? 'not-allowed' : 'pointer',
                                  opacity: submitting ? 0.7 : 1
                                }}
                              >
                                <Send size={16} />
                                {submitting ? 'Enviando...' : 'Confirmar y Enviar Cotización'}
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </>
      )}
    </div>
  );
}
