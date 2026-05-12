import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, FileText, DollarSign, Package, Clock,
  ChevronDown, ChevronUp, CheckCircle, Info, AlertCircle, ArrowRight,
  Upload, X, Image as ImageIcon,
  Factory, Utensils, Scissors, Truck, Beaker, Cpu, Hammer, ClipboardList
} from 'lucide-react';

const CATEGORIES = [
  { id: 'empaques', label: 'Empaques y Envases', icon: <Package size={20} /> },
  { id: 'manufactura', label: 'Manufactura Industrial', icon: <Factory size={20} /> },
  { id: 'alimentos', label: 'Alimentos y Bebidas', icon: <Utensils size={20} /> },
  { id: 'textiles', label: 'Textiles y Confección', icon: <Scissors size={20} /> },
  { id: 'logistica', label: 'Logística y Transporte', icon: <Truck size={20} /> },
  { id: 'quimicos', label: 'Químicos e Insumos', icon: <Beaker size={20} /> },
  { id: 'electronica', label: 'Electrónica y Componentes', icon: <Cpu size={20} /> },
  { id: 'construccion', label: 'Construcción y Materiales', icon: <Hammer size={20} /> },
  { id: 'otros', label: 'Otros', icon: <ClipboardList size={20} /> },
];
import { rfqApi, clientProfileApi } from '../../../api/api';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../../../context/AuthContext';
import ClientVerificationOverlay from '../../../components/ClientVerificationOverlay';

/* ── Status definitions ───────────────────────────────────────────────────── */
const STATUS_MAP = {
  PENDING:   { label: 'En búsqueda',        dot: '#f59e0b', badge: 'rfq-dot-orange' },
  SEARCHING: { label: 'En búsqueda',        dot: '#f59e0b', badge: 'rfq-dot-orange' },
  QUOTED:    { label: 'Lista para revisar', dot: '#16a34a', badge: 'rfq-dot-green'  },
  APPROVED:  { label: 'Convertida a Pedido',dot: '#2563eb', badge: 'rfq-dot-blue'   },
  EXPIRED:   { label: 'Expirada',           dot: '#cbd5e1', badge: 'rfq-dot-gray'   },
};

const FILTERS = ['Todas', 'En búsqueda', 'Lista para revisar', 'Convertida a Pedido', 'Expirada'];
const FILTER_STATUS = {
  'En búsqueda':        ['PENDING', 'SEARCHING'],
  'Lista para revisar': ['QUOTED'],
  'Convertida a Pedido':['APPROVED'],
  'Expirada':           ['EXPIRED'],
};

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function fmtShort(d) {
  return d ? new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '—';
}
function fmtLong(d) {
  return d ? new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

/* ── Quote card (Opción A / B) ────────────────────────────────────────────── */
function QuoteCard({ quote, rfqId, onApprove, approving, isApproved, showApproveBtn }) {
  return (
    <div className={`rfq-quote-card${isApproved ? ' approved' : ''}`}>
      {/* Option label + approved badge */}
      <div className="rfq-quote-top">
        <span className="rfq-quote-label">{quote.label}</span>
        {isApproved && <span className="cd-badge green no-dot" style={{ fontSize: '.72rem' }}>✓ Aprobada</span>}
      </div>

      {/* Supplier */}
      <div className="rfq-quote-supplier">
        <div style={{ marginBottom: '.3rem' }}>{quote.supplierName} · {quote.supplierCountry}</div>
        {quote.supplier && (
          <div style={{ display: 'flex', gap: '1rem', marginTop: '.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.25rem' }} title="Calificación general de productos">
              <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Mkt:</span>
              <span style={{ fontSize: '.78rem', fontWeight: 600, color: '#f59e0b' }}>
                ★ {quote.supplier.marketplaceRating?.toFixed(1) || '0.0'}
              </span>
              <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>({quote.supplier.marketplaceRatingCount || 0})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.25rem' }} title="Calificación como fabricante en cotizaciones">
              <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>RFQs:</span>
              <span style={{ fontSize: '.78rem', fontWeight: 600, color: '#f59e0b' }}>
                ★ {quote.supplier.rfqRating?.toFixed(1) || '0.0'}
              </span>
              <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>({quote.supplier.rfqRatingCount || 0})</span>
            </div>
          </div>
        )}
      </div>

      {/* Data rows */}
      <div className="rfq-quote-rows">
        <div className="rfq-quote-row">
          <DollarSign size={13} className="rfq-qr-icon green" />
          <span>Precio unit.: <strong>${(quote.unitPrice || 0).toFixed(2)}</strong></span>
        </div>
        <div className="rfq-quote-row">
          <Package size={13} className="rfq-qr-icon teal" />
          <span>Total: <strong>${(quote.totalPrice || 0).toLocaleString()} MXN</strong></span>
        </div>
        <div className="rfq-quote-row" style={{ backgroundColor: '#fef2f2', padding: '4px 6px', borderRadius: '4px', margin: '-2px 0 2px -6px', width: 'calc(100% + 12px)' }}>
          <Package size={13} className="rfq-qr-icon" style={{ color: '#ef4444' }} />
          <span style={{ color: '#991b1b', fontSize: '0.8rem' }}>Muestra inicial: <strong>{quote.samplePrice ? `$${(quote.samplePrice || 0).toLocaleString()} MXN` : '¡Gratis!'}</strong></span>
        </div>
        <div className="rfq-quote-row">
          <Clock size={13} className="rfq-qr-icon orange" />
          <span>Tiempo: <strong>{quote.deliveryDays} días</strong></span>
        </div>
        <div className="rfq-quote-row">
          <FileText size={13} className="rfq-qr-icon gray" />
          <span>MOQ: <strong>{(quote.moq || 0).toLocaleString()} pzas</strong></span>
        </div>
      </div>

      {/* Notes */}
      {quote.notes && <div className="rfq-quote-note">{quote.notes}</div>}

      {/* Valid until */}
      {quote.validUntil && (
        <div className="rfq-quote-valid">Válida hasta: {fmtShort(quote.validUntil)}</div>
      )}
    </div>
  );
}

/* ── Expanded body of a QUOTED RFQ ───────────────────────────────────────── */
function RFQBody({ rfq, onApprove, approving }) {
  const [selectedQuote, setSelectedQuote] = useState(null);

  const handleApprove = () => {
    const target = selectedQuote || rfq.quotes?.[0];
    if (!target) return;
    onApprove(rfq.id, target.id);
  };

  const showActions = rfq.status === 'QUOTED' && !rfq.quotes?.find(q => q.isApproved);

  return (
    <div className="rfq-body">
      {/* Top Section: Planos and Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '2rem' }}>
        
        {/* Left: Images */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          {rfq.images && rfq.images !== '[]' && (
            <div className="rfq-images-display">
              <div className="rfq-info-label" style={{ marginBottom: '0.5rem' }}>PLANOS / IMÁGENES DE REFERENCIA</div>
              <div className="rfq-image-preview-wrap" style={{ marginTop: 0 }}>
                {(() => {
                  try {
                    const parsed = JSON.parse(rfq.images);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                      return parsed.map((img, i) => (
                        <a key={i} href={img} target="_blank" rel="noreferrer" className="rfq-image-preview" style={{ cursor: 'zoom-in' }}>
                          <img src={img} alt={`Referencia ${i+1}`} />
                        </a>
                      ));
                    }
                  } catch (e) { return null; }
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Right: Quantity and Updated */}
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div>
            <div className="rfq-info-label">CANTIDAD</div>
            <div className="rfq-info-value bold">{(rfq.quantity || 0).toLocaleString()} {rfq.unit}</div>
          </div>
          <div>
            <div className="rfq-info-label">ACTUALIZADO</div>
            <div className="rfq-info-value">{fmtShort(rfq.updatedAt)}</div>
          </div>
        </div>
      </div>

      {/* Description */}
      {rfq.description && (
        <div style={{ marginBottom: '2rem' }}>
          <div className="rfq-info-label" style={{ marginBottom: '0.5rem' }}>DESCRIPCIÓN</div>
          <div className="rfq-info-value" style={{ lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{rfq.description}</div>
        </div>
      )}

      {/* Quotes */}
      {rfq.quotes?.length > 0 && (
        <>
          {/* Banner */}
          <div className="rfq-banner">
            <Info size={15} style={{ flexShrink: 0, color: '#2563eb' }} />
            Tu gestor encontró <strong>&nbsp;{rfq.quotes.length} opciones</strong>&nbsp;— elige la que mejor se adapte
          </div>

          {/* Quote cards grid */}
          <div className="rfq-quotes-grid">
            {rfq.quotes.map(q => (
              <div
                key={q.id}
                onClick={() => showActions && setSelectedQuote(q)}
                style={{ cursor: showActions ? 'pointer' : 'default' }}
              >
                <QuoteCard
                  quote={q}
                  rfqId={rfq.id}
                  onApprove={onApprove}
                  approving={approving}
                  isApproved={q.isApproved}
                  showApproveBtn={false}
                />
                {/* Selected ring */}
                {showActions && selectedQuote?.id === q.id && (
                  <div className="rfq-selected-check">
                    <CheckCircle size={14} /> Seleccionada
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Approve button */}
          {showActions && (
            <div className="rfq-approve-wrap">
              <button
                className="cd-btn-primary rfq-approve-btn"
                disabled={!!approving}
                onClick={handleApprove}
              >
                {approving ? (
                  'Procesando...'
                ) : (
                  <>
                    <CheckCircle size={15} />
                    Aprobar y Convertir en Pedido
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* SEARCHING state */}
      {(rfq.status === 'SEARCHING' || rfq.status === 'PENDING') && (
        <div className="rfq-searching-msg">
          <AlertCircle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
          Nuestro equipo está buscando las mejores opciones para ti. Te notificaremos cuando estén listas.
        </div>
      )}

      {/* APPROVED state */}
      {rfq.status === 'APPROVED' && (
        <div className="rfq-approved-msg">
          <CheckCircle size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
          Cotización aprobada. El pedido fue creado exitosamente.
        </div>
      )}

      {/* EXPIRED state */}
      {rfq.status === 'EXPIRED' && (
        <div className="rfq-expired-msg">
          <AlertCircle size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
          Esta cotización ha expirado. Puedes crear una nueva solicitud si aún necesitas el producto.
        </div>
      )}
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────────────── */
export default function ClientRFQsPage() {
  const navigate = useNavigate();
  const [rfqs,      setRFQs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('Todas');
  const [search,    setSearch]    = useState('');
  const [open,      setOpen]      = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const { user } = useAuth();
  const [form,      setForm]      = useState({
    title: '', description: '', quantity: '', unit: 'piezas', budget: '', isNegotiable: true, deadline: '', category: '', customCategory: '', images: []
  });
  const [saving,    setSaving]    = useState(false);
  const [approving, setApproving] = useState(null);
  const [toast,     setToast]     = useState({ show: false, message: '', type: 'success' });
  const [confirmApprove, setConfirmApprove] = useState(null);
  const [clientAddress,  setClientAddress]  = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [], 'application/pdf': [] },
    onDrop: (acceptedFiles) => {
      acceptedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          setForm(p => ({ ...p, images: [...(p.images || []), reader.result] }));
        };
        reader.readAsDataURL(file);
      });
    }
  });

  const removeImage = (index) => {
    setForm(p => ({ ...p, images: p.images.filter((_, i) => i !== index) }));
  };

  const load = () =>
    rfqApi.getMyRFQs()
      .then(r => { setRFQs(Array.isArray(r.data) ? r.data : []); })
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  // Load client's registered address to pre-fill shipping
  useEffect(() => {
    clientProfileApi.get()
      .then(r => {
        const profile = r.data?.data || r.data;
        if (profile) {
          const addr = profile.shippingAddress || profile.commercialAddress || '';
          setClientAddress(addr);
        }
      })
      .catch(() => {}); // silently ignore — not all clients have profile
  }, []);

  const toggle = (id) => setOpen(p => (p[id] ? {} : { [id]: true }));

  const filtered = rfqs.filter(r => {
    const matchFilter =
      filter === 'Todas' ||
      (FILTER_STATUS[filter] || []).includes(r.status);
    const matchSearch =
      (r.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.rfqNumber || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const handleCreate = async (e) => {
    e.preventDefault(); 
    if (!form.category) { showToast('Por favor selecciona una categoría', 'error'); return; }
    setSaving(true);
    try {
      const finalCategory = form.category === 'otros' ? form.customCategory : form.category;
      await rfqApi.create({ ...form, quantity: Number(form.quantity), category: finalCategory });
      setShowModal(false);
      showToast("Solicitud de cotización creada exitosamente");
      setForm({ title: '', description: '', quantity: '', unit: 'piezas', budget: '', isNegotiable: true, deadline: '', category: '', customCategory: '', images: [] });
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Error al crear la solicitud', 'error'); }
    finally { setSaving(false); }
  };

  const handleApproveRequest = (rfqId, quoteId) => {
    setConfirmApprove({ rfqId, quoteId, paymentPreference: 'SAMPLE_ONLY', shippingAddress: clientAddress });
  };

  const handleApproveConfirm = async () => {
    if (!confirmApprove) return;
    const { rfqId, quoteId, paymentPreference, shippingAddress } = confirmApprove;
    if (!shippingAddress || shippingAddress.trim() === '') {
      showToast('Por favor ingresa la dirección de envío.', 'error');
      return;
    }
    setConfirmApprove(null);
    setApproving(quoteId);
    try { 
      await rfqApi.approveQuote(rfqId, quoteId, paymentPreference, shippingAddress); 
      showToast("Cotización aprobada. Pedido generado exitosamente.");
      load(); 
    }
    catch (err) { showToast(err.response?.data?.message || 'Error al aprobar la cotización', 'error'); }
    finally { setApproving(null); }
  };

  return (
    <div>
      {/* ── Header ── */}
      <div className="cd-section-header">
        <div>
          <h1 className="cd-section-title">Cotizaciones (RFQs)</h1>
          <p className="cd-section-sub">
            Solicitudes de <span style={{ color: '#2563eb' }}>productos</span> enviadas a nuestro equipo.
          </p>
        </div>
        <button className="cd-btn-primary" onClick={() => {
          if (!user?.profileCompleted) {
            setShowVerification(true);
          } else {
            setShowModal(true);
          }
        }}>
          <Plus size={16} /> Nueva Solicitud
        </button>
      </div>

      {showVerification && (
        <ClientVerificationOverlay 
          onVerified={() => { setShowVerification(false); setShowModal(true); }}
          onCancel={() => setShowVerification(false)}
        />
      )}

      {/* ── Search + Filters ── */}
      <div className="rfq-toolbar">
        <div className="rfq-search-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" className="rfq-search-icon">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="rfq-search"
            placeholder="Buscar por referencia o producto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="rfq-filter-pills">
          {FILTERS.map(f => (
            <button
              key={f}
              className={`rfq-pill${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Empty state ── */}
      {!loading && filtered.length === 0 && (
        <div className="cd-empty">
          <div className="cd-empty-icon"><FileText size={22} /></div>
          <p className="cd-empty-text">No hay solicitudes en esta categoría.</p>
        </div>
      )}

      {loading && (
        <div className="cd-empty"><p className="cd-empty-text">Cargando...</p></div>
      )}

      {/* ── RFQ grid of cards ── */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px', marginTop: '20px' }}>
          {filtered.map(rfq => {
            const visibleQuotesCount = rfq.quotes?.length || 0;
            // If the global status is QUOTED but the admin hasn't forwarded any quote to the client yet,
            // from the client's perspective, it's still SEARCHING.
            const displayStatus = (rfq.status === 'QUOTED' && visibleQuotesCount === 0) ? 'SEARCHING' : rfq.status;
            
            const isOpen = !!open[rfq.id];
            const { label, badge } = STATUS_MAP[displayStatus] || { label: displayStatus, badge: 'rfq-dot-gray' };
            const needsAction = displayStatus === 'QUOTED' && !rfq.quotes?.find(q => q.isApproved);

            return (
              <div 
                key={rfq.id} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'row', 
                  backgroundColor: '#fff', 
                  borderRadius: '16px', 
                  boxShadow: needsAction ? '0 4px 24px rgba(37,99,235,0.18)' : '0 4px 20px rgba(0,0,0,0.06)', 
                  border: isOpen ? '2px solid #2563eb' : needsAction ? '2px solid #2563eb' : '2px solid transparent', 
                  transition: 'border 0.2s, box-shadow 0.2s', 
                  gridColumn: isOpen ? '1 / -1' : 'auto',
                  overflow: 'hidden'
                }}
              >
                {/* Left / Top Side (Always Visible) */}
                <div style={{ display: 'flex', flexDirection: 'column', width: isOpen ? '300px' : '100%', flexShrink: 0 }}>
                  
                  {/* Cover Image at the Top */}
                  <div style={{ position: 'relative', height: '180px', width: '100%', backgroundColor: 'var(--bg-muted)' }}>
                    {(() => {
                      let imgUrl = null;
                      try {
                        const parsed = JSON.parse(rfq.images);
                        if (Array.isArray(parsed) && parsed.length > 0) imgUrl = parsed[0];
                      } catch (e) {}
                      if (imgUrl) {
                        return <img src={imgUrl} alt="Referencia" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
                      }
                      return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><ImageIcon size={32} opacity={0.5} /></div>;
                    })()}
                    
                    {/* Top-Left Quantity Badge */}
                    <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'rgba(0,0,0,0.65)', color: '#fff', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
                       <Package size={15} />
                       {(rfq.quantity || 0).toLocaleString()} {rfq.unit}
                    </div>
                  </div>

                  {/* Supplier Interest Banner (only when action needed) */}
                  {needsAction && (
                    <div style={{ background: 'linear-gradient(90deg, #2563eb, #1d4ed8)', color: '#fff', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 600 }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
                      {rfq.quotes?.length} proveedor{rfq.quotes?.length !== 1 ? 'es quieren' : ' quiere'} trabajar contigo — ¡Revisa sus propuestas!
                    </div>
                  )}

                  {/* Header & Description */}
                  <div style={{ padding: '20px', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', background: 'var(--bg-muted)', borderRadius: '20px', color: 'var(--text)' }}>
                         {rfq.rfqNumber}
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span className={`rfq-status-badge ${badge}`} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
                          <span className="rfq-dot" style={{ width: '6px', height: '6px' }} />
                          {label}
                        </span>
                      </div>
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 8px 0', lineHeight: 1.3 }}>{rfq.title}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                      {rfq.description || 'Sin descripción detallada.'}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: rfq.quotes?.length > 0 ? '#16a34a' : 'var(--text-muted)' }}>
                      {rfq.quotes?.length > 0 ? `${rfq.quotes.length} propuesta(s)` : 'Buscando opciones...'}
                    </div>
                    <button 
                      onClick={() => {
                        if (rfq.status === 'APPROVED' && rfq.orderId) {
                          navigate(`/client/orders/${rfq.orderId}`);
                        } else {
                          toggle(rfq.id);
                        }
                      }} 
                      style={{ 
                        padding: '8px 16px', borderRadius: '8px', 
                        background: isOpen ? '#e2e8f0' : needsAction ? '#2563eb' : 'var(--bg-blue)', 
                        color: isOpen ? 'var(--text)' : needsAction ? '#fff' : 'var(--primary)', 
                        fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      {needsAction && !isOpen ? 'Ver Propuestas' : isOpen ? 'Ocultar' : 'Ver detalles'}
                    </button>
                  </div>
                </div>

                {/* Right Side (Expanded Content) */}
                {isOpen && (
                  <div style={{ flex: 1, overflow: 'hidden', background: 'var(--surface-hover)', borderLeft: '1px solid var(--border)' }}>
                    <div style={{ padding: '24px', minWidth: '400px', height: '100%', overflowY: 'auto' }}>
                      <RFQBody rfq={rfq} onApprove={handleApproveRequest} approving={approving} />
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* ── Toast Notification ── */}
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

      {/* ── Confirm Approve Modal ── */}
      {confirmApprove && (
        <div className="rfq-modal-overlay" onClick={() => setConfirmApprove(null)}>
          <div className="rfq-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="rfq-modal-header">
              <div>
                <h2 className="rfq-modal-title">Confirmar Aprobación</h2>
              </div>
              <button className="rfq-modal-close" onClick={() => setConfirmApprove(null)}>✕</button>
            </div>
            <div className="rfq-modal-body" style={{ padding: '1.5rem', color: 'var(--text)' }}>
              <p style={{ textAlign: 'center', marginBottom: '1.5rem' }}>¿Estás seguro de que deseas aprobar esta cotización y generar un pedido formal?</p>
              
              {/* Direccion de envio */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontWeight: 700, fontSize: '0.9rem', display: 'block', marginBottom: '6px', color: 'var(--text)' }}>
                  Direccion de envio <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Ej: Av. Insurgentes Sur 1234, Col. Del Valle, Ciudad de Mexico, CP 03100..."
                  value={confirmApprove.shippingAddress}
                  onChange={e => setConfirmApprove(p => ({ ...p, shippingAddress: e.target.value }))}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                    border: !confirmApprove.shippingAddress.trim() ? '1px solid #fca5a5' : '1px solid var(--border)',
                    borderRadius: '8px', fontSize: '0.875rem', color: 'var(--text)',
                    background: 'var(--surface)', resize: 'vertical', fontFamily: 'inherit',
                    outline: 'none', lineHeight: 1.5
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  El proveedor vera esta direccion para enviar la muestra y el pedido.
                </p>
              </div>

              {(() => {
                const rfq = rfqs.find(r => r.id === confirmApprove.rfqId);
                const quote = rfq?.quotes?.find(q => q.id === confirmApprove.quoteId);
                const samplePrice = quote?.samplePrice || 0;
                
                return (
                  <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '10px', color: 'var(--text)' }}>Opciones de Pago Inicial</h4>
                    
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px', border: confirmApprove.paymentPreference === 'SAMPLE_ONLY' ? '1px solid #2563eb' : '1px solid var(--border)', borderRadius: '6px', background: confirmApprove.paymentPreference === 'SAMPLE_ONLY' ? '#eff6ff' : '#fff', cursor: 'pointer', marginBottom: '10px', transition: 'all 0.2s' }}>
                      <input 
                        type="radio" 
                        name="paymentPreference" 
                        value="SAMPLE_ONLY" 
                        checked={confirmApprove.paymentPreference === 'SAMPLE_ONLY'}
                        onChange={() => setConfirmApprove(p => ({ ...p, paymentPreference: 'SAMPLE_ONLY' }))}
                        style={{ marginTop: '4px' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Pagar solo la muestra {samplePrice > 0 ? `($${samplePrice.toLocaleString()} MXN)` : '(Gratis)'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>La producción masiva comenzará cuando apruebes la muestra física y pagues el anticipo.</div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px', border: confirmApprove.paymentPreference === 'DEPOSIT_AND_SAMPLE' ? '1px solid #2563eb' : '1px solid var(--border)', borderRadius: '6px', background: confirmApprove.paymentPreference === 'DEPOSIT_AND_SAMPLE' ? '#eff6ff' : '#fff', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <input 
                        type="radio" 
                        name="paymentPreference" 
                        value="DEPOSIT_AND_SAMPLE" 
                        checked={confirmApprove.paymentPreference === 'DEPOSIT_AND_SAMPLE'}
                        onChange={() => setConfirmApprove(p => ({ ...p, paymentPreference: 'DEPOSIT_AND_SAMPLE' }))}
                        style={{ marginTop: '4px' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Pagar anticipo (50%) + muestra</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Asegura tu precio y lugar en la línea de producción del proveedor de inmediato.</div>
                      </div>
                    </label>
                  </div>
                );
              })()}
            </div>
            <div className="rfq-modal-footer">
              <button type="button" className="rfq-cancel-btn" onClick={() => setConfirmApprove(null)}>Cancelar</button>
              <button 
                type="button" 
                className="rfq-cancel-btn" 
                style={{ 
                  borderColor: confirmApprove.shippingAddress.trim() ? 'var(--primary)' : '#d1d5db', 
                  color: confirmApprove.shippingAddress.trim() ? 'var(--primary)' : '#9ca3af',
                  cursor: confirmApprove.shippingAddress.trim() ? 'pointer' : 'not-allowed'
                }} 
                onClick={handleApproveConfirm}
                disabled={!confirmApprove.shippingAddress.trim()}
              >Confirmar Pedido</button>
            </div>
          </div>
        </div>
      )}

      {/* ── New RFQ modal ── */}
      {showModal && (
        <div className="rfq-modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="rfq-modal">
            {/* Header */}
            <div className="rfq-modal-header">
              <div>
                <h2 className="rfq-modal-title">Nueva Solicitud de Cotización</h2>
                <p className="rfq-modal-sub">Nuestro equipo buscará las mejores opciones para ti.</p>
              </div>
              <button className="rfq-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {/* Body */}
            <form onSubmit={handleCreate}>
              <div className="rfq-modal-body">

                {/* Producto */}
                <div className="rfq-field">
                  <label className="rfq-label">Producto *</label>
                  <input
                    className="rfq-input"
                    required
                    placeholder="Ej. Cajas de cartón corrugado"
                    value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  />
                </div>

                {/* Descripción */}
                <div className="rfq-field">
                  <label className="rfq-label">Descripción / Especificaciones *</label>
                  <textarea
                    className="rfq-input rfq-textarea"
                    required
                    placeholder="Material, medidas, colores, acabados, requerimientos especiales..."
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  />
                </div>

                {/* Cantidad + Unidad */}
                <div className="rfq-modal-row">
                  <div className="rfq-field">
                    <label className="rfq-label">Cantidad *</label>
                    <input
                      className="rfq-input"
                      type="number"
                      required
                      min="1"
                      placeholder="5000"
                      value={form.quantity}
                      onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                    />
                  </div>
                  <div className="rfq-field">
                    <label className="rfq-label">Unidad</label>
                    <select
                      className="rfq-input rfq-select"
                      value={form.unit}
                      onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                    >
                      {['piezas', 'kg', 'toneladas', 'metros', 'rollos', 'cajas', 'litros'].map(u => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Presupuesto + Fecha */}
                <div className="rfq-modal-row">
                  <div className="rfq-field">
                    <label className="rfq-label">Presupuesto máx. (MXN)</label>
                    <input
                      className="rfq-input"
                      type="number"
                      min="0"
                      placeholder="50000"
                      value={form.budget}
                      onChange={e => setForm(p => ({ ...p, budget: e.target.value }))}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '0.85rem', color: '#475569', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                        checked={form.isNegotiable} 
                        onChange={e => setForm(p => ({ ...p, isNegotiable: e.target.checked }))} 
                      />
                      ¿Se puede negociar el precio?
                    </label>
                    {!form.isNegotiable && (
                      <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#dc2626', lineHeight: 1.4 }}>
                        Al no ser negociable, es menos probable que recibas propuestas de diferentes proveedores.
                      </div>
                    )}
                  </div>
                  <div className="rfq-field">
                    <label className="rfq-label">Fecha límite deseada</label>
                    <input
                      className="rfq-input"
                      type="date"
                      value={form.deadline}
                      onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Categoría */}
                <div className="rfq-field">
                  <label className="rfq-label">Categoría del Producto *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                    {CATEGORIES.map(cat => (
                      <div
                        key={cat.id}
                        onClick={() => setForm(p => ({ ...p, category: cat.id }))}
                        style={{
                          border: `1px solid ${form.category === cat.id ? '#2563eb' : 'var(--border)'}`,
                          backgroundColor: form.category === cat.id ? 'var(--bg-blue-light, #eff6ff)' : 'var(--card-bg)',
                          borderRadius: '8px', padding: '12px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '12px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ color: form.category === cat.id ? '#2563eb' : 'var(--text-muted)' }}>{cat.icon}</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: form.category === cat.id ? '#1e3a8a' : 'var(--text)' }}>{cat.label}</div>
                      </div>
                    ))}
                  </div>
                  {form.category === 'otros' && (
                    <input
                      className="rfq-input"
                      style={{ marginTop: '0.75rem' }}
                      placeholder="Escribe la categoría (ej. Empaques ecológicos)"
                      value={form.customCategory}
                      onChange={e => setForm(p => ({ ...p, customCategory: e.target.value }))}
                      required
                    />
                  )}
                </div>

                {/* Adjuntar Imágenes / Planos */}
                <div className="rfq-field">
                  <label className="rfq-label">Planos o Imágenes de Referencia</label>
                  <div 
                    {...getRootProps()} 
                    className={`rfq-dropzone ${isDragActive ? 'active' : ''}`}
                  >
                    <input {...getInputProps()} />
                    <Upload size={24} className="rfq-dropzone-icon" />
                    <p className="rfq-dropzone-text">
                      {isDragActive ? "Suelta los archivos aquí..." : "Arrastra tus archivos aquí o haz clic para subir"}
                    </p>
                  </div>
                  
                  {/* Vista previa de imágenes */}
                  {form.images && form.images.length > 0 && (
                    <div className="rfq-image-preview-wrap">
                      {form.images.map((img, i) => (
                        <div key={i} className="rfq-image-preview">
                          <img src={img} alt="preview" />
                          <button 
                            type="button"
                            className="rfq-image-preview-btn"
                            onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Footer */}
              <div className="rfq-modal-footer">
                <button type="button" className="rfq-cancel-btn" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="rfq-submit-btn" disabled={saving}>
                  {saving ? 'Enviando...' : <><span>Enviar Solicitud</span><ArrowRight size={16}/></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
