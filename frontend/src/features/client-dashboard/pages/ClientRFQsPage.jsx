import { useEffect, useState } from 'react';
import {
  Plus, FileText, DollarSign, Package, Clock,
  ChevronDown, ChevronUp, CheckCircle, Info, AlertCircle, ArrowRight,
  Upload, X, Image as ImageIcon
} from 'lucide-react';
import { rfqApi } from '../../../api/api';
import { useDropzone } from 'react-dropzone';

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
      {/* Info row: Description | Quantity | Updated */}
      {rfq.description && (
        <div className="rfq-info-grid">
          <div>
            <div className="rfq-info-label">DESCRIPCIÓN</div>
            <div className="rfq-info-value">{rfq.description}</div>
          </div>
          <div>
            <div className="rfq-info-label">CANTIDAD</div>
            <div className="rfq-info-value bold">{(rfq.quantity || 0).toLocaleString()} {rfq.unit}</div>
          </div>
          <div>
            <div className="rfq-info-label">ACTUALIZADO</div>
            <div className="rfq-info-value">{fmtShort(rfq.updatedAt)}</div>
          </div>
        </div>
      )}

      {/* Attached Images */}
      {rfq.images && rfq.images !== '[]' && (
        <div className="rfq-images-display">
          <div className="rfq-info-label" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>PLANOS / IMÁGENES DE REFERENCIA</div>
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
  const [rfqs,      setRFQs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('Todas');
  const [search,    setSearch]    = useState('');
  const [open,      setOpen]      = useState({});
  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState({
    title: '', description: '', quantity: '', unit: 'piezas', budget: '', deadline: '', category: 'general', images: []
  });
  const [saving,    setSaving]    = useState(false);
  const [approving, setApproving] = useState(null);
  const [toast,     setToast]     = useState({ show: false, message: '', type: 'success' });
  const [confirmApprove, setConfirmApprove] = useState(null);

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

  const toggle = (id) => setOpen(p => ({ ...p, [id]: !p[id] }));

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
    e.preventDefault(); setSaving(true);
    try {
      await rfqApi.create({ ...form, quantity: Number(form.quantity) });
      setShowModal(false);
      showToast("Solicitud de cotización creada exitosamente");
      setForm({ title: '', description: '', quantity: '', unit: 'piezas', budget: '', deadline: '', category: 'general', images: [] });
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Error al crear la solicitud', 'error'); }
    finally { setSaving(false); }
  };

  const handleApproveRequest = (rfqId, quoteId) => {
    setConfirmApprove({ rfqId, quoteId });
  };

  const handleApproveConfirm = async () => {
    if (!confirmApprove) return;
    const { rfqId, quoteId } = confirmApprove;
    setConfirmApprove(null);
    setApproving(quoteId);
    try { 
      await rfqApi.approveQuote(rfqId, quoteId); 
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
        <button className="cd-btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Nueva Solicitud
        </button>
      </div>

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

      {/* ── RFQ accordion list ── */}
      {!loading && filtered.map(rfq => {
        const isOpen = !!open[rfq.id];
        const { label, badge } = STATUS_MAP[rfq.status] || { label: rfq.status, badge: 'rfq-dot-gray' };
        const needsAction = rfq.status === 'QUOTED' && !rfq.quotes?.find(q => q.isApproved);

        return (
          <div key={rfq.id} className="rfq-card">
            {/* ── Card header (always visible) ── */}
            <div className="rfq-card-header" onClick={() => toggle(rfq.id)}>
              <div className="rfq-card-file-icon">
                <FileText size={15} />
              </div>

              <div className="rfq-card-info">
                {/* Row 1: number + badges */}
                <div className="rfq-card-badges-row">
                  <span className="rfq-number">{rfq.rfqNumber}</span>
                  <span className={`rfq-status-badge ${badge}`}>
                    <span className="rfq-dot" />
                    {label}
                  </span>
                  {needsAction && (
                    <span className="rfq-action-badge">¡Acción requerida!</span>
                  )}
                </div>
                {/* Row 2: title */}
                <div className="rfq-card-title">{rfq.title}</div>
                {/* Row 3: meta */}
                <div className="rfq-card-meta">
                  {(rfq.quantity || 0).toLocaleString()} {rfq.unit} · Solicitado: {fmtLong(rfq.createdAt)}
                </div>
              </div>

              <div className="rfq-card-chevron">
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {/* ── Expanded body ── */}
            {isOpen && (
              <RFQBody
                rfq={rfq}
                onApprove={handleApproveRequest}
                approving={approving}
              />
            )}
          </div>
        );
      })}

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
          <div className="rfq-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="rfq-modal-header">
              <div>
                <h2 className="rfq-modal-title">Confirmar Aprobación</h2>
              </div>
              <button className="rfq-modal-close" onClick={() => setConfirmApprove(null)}>✕</button>
            </div>
            <div className="rfq-modal-body" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text)' }}>
              ¿Estás seguro de que deseas aprobar esta cotización y generar un pedido formal?
            </div>
            <div className="rfq-modal-footer">
              <button type="button" className="rfq-cancel-btn" onClick={() => setConfirmApprove(null)}>Cancelar</button>
              <button type="button" className="rfq-cancel-btn" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }} onClick={handleApproveConfirm}>Confirmar Pedido</button>
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
                  <select
                    className="rfq-input rfq-select"
                    value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  >
                    {['general', 'empaques', 'manufactura', 'alimentos', 'textiles', 'logistica', 'quimicos', 'otros'].map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
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
