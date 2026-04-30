import { useEffect, useState } from 'react';
import {
  Plus, FileText, DollarSign, Package, Clock,
  ChevronDown, ChevronUp, CheckCircle, Info, AlertCircle, ArrowRight,
} from 'lucide-react';
import { rfqApi } from '../../../api/api';

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
        {quote.supplierName} · {quote.supplierCountry}
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
    if (!confirm('¿Confirmas aprobar esta cotización y convertirla en pedido?')) return;
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
    title: '', description: '', quantity: '', unit: 'piezas', budget: '', deadline: '',
  });
  const [saving,    setSaving]    = useState(false);
  const [approving, setApproving] = useState(null);

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
      setForm({ title: '', description: '', quantity: '', unit: 'piezas', budget: '', deadline: '' });
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error al crear la solicitud'); }
    finally { setSaving(false); }
  };

  const handleApprove = async (rfqId, quoteId) => {
    setApproving(quoteId);
    try { await rfqApi.approveQuote(rfqId, quoteId); load(); }
    catch (err) { alert(err.response?.data?.message || 'Error al aprobar'); }
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
                onApprove={handleApprove}
                approving={approving}
              />
            )}
          </div>
        );
      })}

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
