import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle, Clock, AlertTriangle, CreditCard, FileText,
  Copy, Check, Eye, Download, Info, X,
} from 'lucide-react';
import { paymentApi } from '../../../api/api';

/* ── helpers ──────────────────────────────────────────────────────────────── */
const fmtMoney  = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate   = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_MAP = {
  PAID:    { label: 'Pagado',    badge: 'green',  icon: CheckCircle },
  PENDING: { label: 'Pendiente', badge: 'orange', icon: Clock },
  OVERDUE: { label: 'Vencido',   badge: 'red',    icon: AlertTriangle },
};
const TYPE_MAP  = { DEPOSIT: 'Anticipo', BALANCE: 'Saldo Final', FULL: 'Pago Completo' };
const TABS      = ['Pagos', 'Facturas CFDI'];
const PAY_FILTERS = ['Todas', 'Pendiente', 'Vencido', 'Pagado'];
// Map Spanish filter labels → backend English status values
const FILTER_STATUS_MAP = { 'Pendiente': 'PENDING', 'Vencido': 'OVERDUE', 'Pagado': 'PAID' };

/* ── Mock CFDIs (seed data matching Figma) ───────────────────────────────── */
const MOCK_CFDIS = [
  {
    id: 'cfdi-1',
    folio: 'CFDI-2026-001', serie: 'F-1001', status: 'VIGENTE',
    description: 'Bolsas de polietileno con cierre hermético tipo zipper, transparentes 15x20 cm calibre 200 — Anticipo 50% del pedido...',
    orderRef: 'ORD-2026-031', orderId: '', date: '2026-03-07', payMethod: 'PUE',
    payForm: '03 – Transferencia electrónica de fondos', moneda: 'MXN',
    rfcEmisor: 'BPI210315AB1', emisorName: 'B2B Platform Internacional S.A. de C.V.',
    emisorRegimen: '601 – Régimen General de Ley Personas Morales',
    rfcReceptor: 'DN0951204ABC', receptorName: 'Distribuidora del Norte S.A. de C.V.',
    receptorRegimen: '601 – Régimen General de Ley Personas Morales',
    receptorUsoCfdi: 'G01 – Adquisición de mercancias', receptorCp: '64000',
    total: 16530, subtotal: 14250,
    uuid: 'A1B2C3D4-E5F6-7890-ABCD-EF1234567B01',
    payRef: 'FAC-2026-031-A',
    partidas: [{
      cant: 10000, unidad: 'Pieza', claveUnidad: 'H87',
      descripcion: 'Bolsas de polietileno con cierre hermético tipo zipper, transparentes 15x20 cm calibre 200 — Anticipo 50% del pedido ORD-2026-031',
      claveSat: '31211701', precioUnit: 1.43, importe: 14250, iva: 2280,
    }],
  },
  {
    id: 'cfdi-2',
    folio: 'CFDI-2026-002', serie: 'F-1002', status: 'VIGENTE',
    description: 'Cajas de cartón corrugado doble capa 30x20x15 cm impresión a 2 colores — Anticipo 50% del pedido ORD-2026-019',
    orderRef: 'ORD-2026-019', orderId: '', date: '2026-02-22', payMethod: 'PPD',
    payForm: '03 – Transferencia electrónica de fondos', moneda: 'MXN',
    rfcEmisor: 'BPI210315AB1', emisorName: 'B2B Platform Internacional S.A. de C.V.',
    emisorRegimen: '601 – Régimen General de Ley Personas Morales',
    rfcReceptor: 'DN0951204ABC', receptorName: 'Distribuidora del Norte S.A. de C.V.',
    receptorRegimen: '601 – Régimen General de Ley Personas Morales',
    receptorUsoCfdi: 'G01 – Adquisición de mercancias', receptorCp: '64000',
    total: 14790, subtotal: 12750,
    uuid: 'B2C3D4E5-F6A7-8901-BCDE-F12345678902',
    payRef: 'FAC-2026-019-A',
    partidas: [{
      cant: 5000, unidad: 'Caja', claveUnidad: 'BX',
      descripcion: 'Cajas de cartón corrugado doble capa 30x20x15 cm impresión a 2 colores con logo — Anticipo 50% del pedido ORD-2026-019',
      claveSat: '24112000', precioUnit: 2.55, importe: 12750, iva: 2040,
    }],
  },
  {
    id: 'cfdi-3',
    folio: 'CFDI-2026-003', serie: 'F-1003', status: 'VIGENTE',
    description: 'Stretch film industrial 500mm × 300m, calibre 23 micras, core 76mm — Pago total pedido ORD-2026-008',
    orderRef: 'ORD-2026-008', orderId: '', date: '2026-02-14', payMethod: 'PUE',
    payForm: '04 – Tarjeta de crédito', moneda: 'MXN',
    rfcEmisor: 'BPI210315AB1', emisorName: 'B2B Platform Internacional S.A. de C.V.',
    emisorRegimen: '601 – Régimen General de Ley Personas Morales',
    rfcReceptor: 'DN0951204ABC', receptorName: 'Distribuidora del Norte S.A. de C.V.',
    receptorRegimen: '601 – Régimen General de Ley Personas Morales',
    receptorUsoCfdi: 'G01 – Adquisición de mercancias', receptorCp: '64000',
    total: 14848, subtotal: 12800,
    uuid: 'C3D4E5F6-A7B8-0812-CDEF-012345678903',
    payRef: 'FAC-2026-008',
    partidas: [{
      cant: 200, unidad: 'Rollo', claveUnidad: 'RO',
      descripcion: 'Stretch film industrial 500mm × 300m, calibre 23 micras, core 76mm — Pago total pedido ORD-2026-008',
      claveSat: '20100000', precioUnit: 64.00, importe: 12800, iva: 2048,
    }],
  },
  {
    id: 'cfdi-4',
    folio: 'CFDI-2026-004', serie: 'F-1004', status: 'EN_PROCESO',
    description: 'Empaque biodegradable kraft 20x30 cm con ventana PLA, impresión 1 color — Anticipo 40% pedido ORD-2026-035',
    orderRef: 'ORD-2026-035', orderId: '', date: '2026-03-15', payMethod: 'PPD',
    payForm: '03 – Transferencia electrónica de fondos', moneda: 'MXN',
    rfcEmisor: 'BPI210315AB1', emisorName: 'B2B Platform Internacional S.A. de C.V.',
    emisorRegimen: '601 – Régimen General de Ley Personas Morales',
    rfcReceptor: 'DN0951204ABC', receptorName: 'Distribuidora del Norte S.A. de C.V.',
    receptorRegimen: '601 – Régimen General de Ley Personas Morales',
    receptorUsoCfdi: 'G01 – Adquisición de mercancias', receptorCp: '64000',
    total: 14384, subtotal: 12400,
    uuid: null, payRef: 'FAC-2026-035-A',
    partidas: [{
      cant: 8000, unidad: 'Pieza', claveUnidad: 'H87',
      descripcion: 'Empaque biodegradable kraft 20x30 cm con ventana PLA, impresión 1 color — Anticipo 40% del pedido ORD-2026-035',
      claveSat: '24112000', precioUnit: 1.55, importe: 12400, iva: 1984,
    }],
  },
];

const CFDI_STATUS = {
  VIGENTE:    { label: 'Vigente',    cls: 'cfdi-badge-green'  },
  EN_PROCESO: { label: 'En proceso', cls: 'cfdi-badge-orange' },
  CANCELADO:  { label: 'Cancelado',  cls: 'cfdi-badge-red'    },
};

/* ── CopyUUID button ──────────────────────────────────────────────────────── */
function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  if (label) {
    return (
      <button className="cfdi-modal-copy-btn" onClick={handle}>
        {copied ? <Check size={13} style={{ color: '#16a34a' }} /> : <Copy size={13} />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    );
  }
  return (
    <button className="cfdi-copy-btn" onClick={handle} title="Copiar UUID">
      {copied ? <Check size={12} style={{ color: '#16a34a' }} /> : <Copy size={12} />}
    </button>
  );
}

/* ── CFDI Modal ────────────────────────────────────────────────────────────── */
function CFDIModal({ cfdi, onClose }) {
  if (!cfdi) return null;
  const iva = cfdi.total - cfdi.subtotal;
  const st = CFDI_STATUS[cfdi.status] || CFDI_STATUS.VIGENTE;
  return (
    <div className="cfdi-modal-overlay" onClick={onClose}>
      <div className="cfdi-modal" onClick={e => e.stopPropagation()}>
        {/* ── Header ── */}
        <div className="cfdi-modal-header">
          <div className="cfdi-modal-header-left">
            <div className="cfdi-modal-icon-wrap"><FileText size={20} /></div>
            <div>
              <div className="cfdi-modal-title">Comprobante Fiscal Digital (CFDI)</div>
              <div className="cfdi-modal-subtitle">Versión 4.0 · SAT México</div>
            </div>
          </div>
          <div className="cfdi-modal-header-actions">
            <button className="cfdi-modal-btn-outline" onClick={() => window.print()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Imprimir
            </button>
            <button className="cfdi-modal-btn-primary">
              <Download size={13} /> Descargar XML
            </button>
            <button className="cfdi-modal-close" onClick={onClose}><X size={18} /></button>
          </div>
        </div>
        {/* ── Scrollable body ── */}
        <div className="cfdi-modal-body">
          {/* Folio row */}
          <div className="cfdi-modal-folio-row">
            <div className="cfdi-modal-folio-cell">
              <div className="cfdi-modal-field-label">Folio Interno</div>
              <div className="cfdi-modal-field-value bold">{cfdi.folio}</div>
            </div>
            <div className="cfdi-modal-folio-divider" />
            <div className="cfdi-modal-folio-cell">
              <div className="cfdi-modal-field-label">Serie / Folio SAT</div>
              <div className="cfdi-modal-field-value">{cfdi.serie}</div>
            </div>
            <div className="cfdi-modal-folio-divider" />
            <div className="cfdi-modal-folio-cell" style={{ flex: 2 }}>
              <div className="cfdi-modal-field-label">Fecha de Emisión</div>
              <div className="cfdi-modal-field-value">
                {new Date(cfdi.date).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })}, 10:22 a.m.
              </div>
            </div>
            <div className="cfdi-modal-vigente-badge">
              <span className="cfdi-modal-dot-green" />{st.label}
            </div>
          </div>

          {/* UUID row */}
          {cfdi.uuid && (
            <div className="cfdi-modal-uuid-row">
              <span className="cfdi-modal-uuid-hash">#</span>
              <div>
                <div className="cfdi-modal-uuid-title">UUID / Folio Fiscal (Timbre SAT)</div>
                <div className="cfdi-modal-uuid-val">{cfdi.uuid}</div>
              </div>
              <CopyButton text={cfdi.uuid} label />
            </div>
          )}

          {/* Emisor / Receptor */}
          <div className="cfdi-modal-parties">
            <div className="cfdi-modal-party-card">
              <div className="cfdi-modal-party-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>
                <span>EMISOR</span>
              </div>
              <div className="cfdi-modal-party-name">{cfdi.emisorName}</div>
              <div className="cfdi-modal-party-row"><span className="cfdi-modal-party-lbl">RFC</span><span className="cfdi-modal-party-rfc">{cfdi.rfcEmisor}</span></div>
              <div className="cfdi-modal-party-row"><span className="cfdi-modal-party-lbl">Régimen Fiscal</span><span>{cfdi.emisorRegimen}</span></div>
            </div>
            <div className="cfdi-modal-party-card">
              <div className="cfdi-modal-party-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                <span>RECEPTOR</span>
              </div>
              <div className="cfdi-modal-party-name">{cfdi.receptorName}</div>
              <div className="cfdi-modal-party-row"><span className="cfdi-modal-party-lbl">RFC</span><span className="cfdi-modal-party-rfc blue">{cfdi.rfcReceptor}</span></div>
              <div className="cfdi-modal-party-row"><span className="cfdi-modal-party-lbl">Régimen Fiscal</span><span>{cfdi.receptorRegimen}</span></div>
              <div className="cfdi-modal-party-row"><span className="cfdi-modal-party-lbl">Uso CFDI</span><span>{cfdi.receptorUsoCfdi}</span></div>
              <div className="cfdi-modal-party-row"><span className="cfdi-modal-party-lbl">C.P.</span><span>{cfdi.receptorCp}</span></div>
            </div>
          </div>

          {/* Payment metadata */}
          <div className="cfdi-modal-meta-grid">
            <div className="cfdi-modal-meta-cell">
              <div className="cfdi-modal-field-label">Método de Pago</div>
              <div className="cfdi-modal-field-value">{cfdi.payMethod === 'PUE' ? 'PUE – Una sola exhibición' : 'PPD – Parcialidades'}</div>
            </div>
            <div className="cfdi-modal-meta-cell">
              <div className="cfdi-modal-field-label">Forma de Pago</div>
              <div className="cfdi-modal-field-value">{cfdi.payForm}</div>
            </div>
            <div className="cfdi-modal-meta-cell">
              <div className="cfdi-modal-field-label">Moneda</div>
              <div className="cfdi-modal-field-value">{cfdi.moneda}</div>
            </div>
            <div className="cfdi-modal-meta-cell">
              <div className="cfdi-modal-field-label">Pedido Relacionado</div>
              <div className="cfdi-modal-field-value">{cfdi.orderRef}</div>
            </div>
          </div>

          {/* Partidas */}
          <div className="cfdi-modal-section-title">PARTIDAS / CONCEPTOS</div>
          <div className="cfdi-modal-table-wrap">
            <table className="cfdi-modal-table">
              <thead>
                <tr>
                  <th>CANT.</th><th>DESCRIPCIÓN</th><th>CLAVE SAT</th><th>PRECIO UNIT.</th><th>IMPORTE</th><th>IVA</th>
                </tr>
              </thead>
              <tbody>
                {(cfdi.partidas || []).map((p, i) => (
                  <tr key={i}>
                    <td><strong>{p.cant.toLocaleString()}</strong><span className="cfdi-modal-unit">{p.unidad} ({p.claveUnidad})</span></td>
                    <td>{p.descripcion}</td>
                    <td><span className="cfdi-modal-clave">{p.claveSat}</span></td>
                    <td>${p.precioUnit.toFixed(2)}</td>
                    <td>${p.importe.toLocaleString('es-MX', {minimumFractionDigits:2})}</td>
                    <td className="cfdi-modal-iva">${p.iva.toLocaleString('es-MX', {minimumFractionDigits:2})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="cfdi-modal-totals">
            <div className="cfdi-modal-totals-inner">
              <div className="cfdi-modal-total-row"><span>Subtotal</span><span>${cfdi.subtotal.toLocaleString('es-MX',{minimumFractionDigits:2})} MXN</span></div>
              <div className="cfdi-modal-total-row"><span>IVA trasladado (16%)</span><span>${iva.toLocaleString('es-MX',{minimumFractionDigits:2})} MXN</span></div>
              <div className="cfdi-modal-total-row grand"><span>Total</span><span>${cfdi.total.toLocaleString('es-MX',{minimumFractionDigits:2})} MXN</span></div>
            </div>
          </div>

          {/* Payment ref footer */}
          {cfdi.payRef && (
            <div className="cfdi-modal-payref">
              <Clock size={13} /> Pago relacionado: <strong>{cfdi.payRef}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── CFDI Card ────────────────────────────────────────────────────────────── */
function CFDICard({ cfdi, onVer }) {
  const st = CFDI_STATUS[cfdi.status] || CFDI_STATUS.VIGENTE;
  const iva = cfdi.total - cfdi.subtotal;

  return (
    <div className={`cfdi-card${cfdi.status === 'EN_PROCESO' ? ' en-proceso' : ''}`}>
      {/* ── Top row ── */}
      <div className="cfdi-card-top">
        {/* Left: icon + info */}
        <div className="cfdi-card-icon">
          <FileText size={16} />
        </div>

        <div className="cfdi-card-main">
          {/* Row 1: folio + serie + badge */}
          <div className="cfdi-head-row">
            <span className="cfdi-folio">{cfdi.folio}</span>
            <span className="cfdi-serie">Serie {cfdi.serie}</span>
            <span className={`cfdi-status-badge ${st.cls}`}>
              <span className="cfdi-dot" /> {st.label}
            </span>
          </div>

          {/* Row 2: description */}
          <div className="cfdi-desc">{cfdi.description}</div>

          {/* Row 3: meta */}
          <div className="cfdi-meta-row">
            <span className="cfdi-meta-icon">📋</span>
            <Link to={`/client/orders`} className="cfdi-order-link">{cfdi.orderRef}</Link>
            <span className="cfdi-sep">·</span>
            <span>{fmtDate(cfdi.date)}</span>
            <span className="cfdi-sep">·</span>
            <span className="cfdi-pill-sm">{cfdi.payMethod}</span>
            <span className="cfdi-sep">·</span>
            <span>{cfdi.payForm}</span>
          </div>
        </div>

        {/* Right: RFC + Amount + Actions */}
        <div className="cfdi-card-right">
          {/* RFC */}
          <div className="cfdi-rfc-block">
            <div className="cfdi-rfc-row">
              <span className="cfdi-rfc-label">RFC Emisor:</span>
              <span className="cfdi-rfc-value">{cfdi.rfcEmisor}</span>
            </div>
            <div className="cfdi-rfc-row">
              <span className="cfdi-rfc-label">RFC Receptor:</span>
              <span className="cfdi-rfc-value blue">{cfdi.rfcReceptor}</span>
            </div>
          </div>

          {/* Amount */}
          <div className="cfdi-amount-block">
            <div className="cfdi-total">{fmtMoney(cfdi.total)}</div>
            <div className="cfdi-amount-meta">IVA incl. · MXN</div>
            <div className="cfdi-amount-meta">Sub: {fmtMoney(cfdi.subtotal)}</div>
          </div>

          {/* Action buttons */}
          <div className="cfdi-actions">
            {cfdi.status !== 'EN_PROCESO' && (
              <button className="cfdi-btn-ver" onClick={() => onVer(cfdi)}>
                <Eye size={13} /> Ver
              </button>
            )}
            {cfdi.status !== 'EN_PROCESO' && (
              <button className="cfdi-btn-xml">
                <Download size={12} /> XML/PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── UUID row ── */}
      {cfdi.uuid ? (
        <div className="cfdi-uuid-row">
          <span className="cfdi-uuid-icon">⬡</span>
          <span className="cfdi-uuid-label">UUID:</span>
          <span className="cfdi-uuid-value">{cfdi.uuid}</span>
          <CopyButton text={cfdi.uuid} />
        </div>
      ) : (
        <div className="cfdi-en-proceso-note">
          <Clock size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
          Factura en proceso de timbrado SAT. Tiempo estimado: 24-48 hrs.
        </div>
      )}
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────── */
export default function ClientPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [summary,  setSummary]  = useState({});
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('Todas');
  const [tab,      setTab]      = useState('Pagos');
  const [payingId, setPayingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [cfdiModal, setCfdiModal] = useState(null);
  const [cfdiSearch, setCfdiSearch] = useState('');

  const load = () =>
    Promise.all([paymentApi.getMyPayments(), paymentApi.getSummary()])
      .then(([p, s]) => { setPayments(Array.isArray(p.data) ? p.data : []); setSummary(s.data || {}); })
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handlePay = async (id) => {
    setConfirmId(id);
  };

  const confirmPay = async () => {
    const id = confirmId;
    setConfirmId(null);
    setPayingId(id);
    try { await paymentApi.pay(id); load(); } catch { alert('Error al procesar pago'); }
    finally { setPayingId(null); }
  };

  const hasOverdue = (summary.totalOverdue || 0) > 0;
  // Fix: map Spanish filter label → English backend status for correct comparison
  const filtered   = payments.filter(p =>
    filter === 'Todas' || p.status === FILTER_STATUS_MAP[filter]
  );

  /* CFDI search filter */
  const cfdiFiltered = MOCK_CFDIS.filter(c =>
    cfdiSearch === '' ||
    c.folio.toLowerCase().includes(cfdiSearch.toLowerCase()) ||
    c.orderRef.toLowerCase().includes(cfdiSearch.toLowerCase()) ||
    (c.uuid || '').toLowerCase().includes(cfdiSearch.toLowerCase())
  );

  /* Totals */
  const cfdiTotals = MOCK_CFDIS.reduce(
    (acc, c) => ({ sin: acc.sin + c.subtotal, iva: acc.iva + (c.total - c.subtotal), total: acc.total + c.total }),
    { sin: 0, iva: 0, total: 0 }
  );

  if (loading) return <div className="cd-empty"><p className="cd-empty-text">Cargando...</p></div>;

  return (
    <div>
      {/* ── Page header ── */}
      <div className="cd-section-header">
        <div>
          <h1 className="cd-section-title">Facturación y Pagos</h1>
          <p className="cd-section-sub">Gestión de pagos y comprobantes fiscales CFDI.</p>
        </div>
      </div>

      {/* ── Stat cards (only on Pagos tab) ── */}
      {tab === 'Pagos' && (
        <div className="cd-stat-grid" style={{ marginBottom: '1.25rem' }}>
          <div className="cd-stat-card">
            <div className="cd-stat-icon green"><CheckCircle size={18} /></div>
            <div className="cd-stat-amount">{fmtMoney(summary.totalPaid || 0)}</div>
            <div className="cd-stat-label">Total Pagado · {summary.paidCount || 0} facturas</div>
          </div>
          <div className="cd-stat-card">
            <div className="cd-stat-icon orange"><Clock size={18} /></div>
            <div className="cd-stat-amount">{fmtMoney(summary.totalPending || 0)}</div>
            <div className="cd-stat-label">Pendiente de Pago · {summary.pendingCount || 0} facturas</div>
          </div>
          <div className={`cd-stat-card ${hasOverdue ? 'danger' : ''}`}>
            <div className={`cd-stat-icon ${hasOverdue ? 'red' : 'green'}`}><AlertTriangle size={18} /></div>
            <div className={`cd-stat-amount ${hasOverdue ? 'red' : ''}`}>{fmtMoney(summary.totalOverdue || 0)}</div>
            <div className="cd-stat-label">Vencido</div>
            {hasOverdue && <div className="cd-stat-sub">Requiere atención</div>}
          </div>
        </div>
      )}

      {/* ── Overdue alert ── */}
      {tab === 'Pagos' && hasOverdue && (
        <div className="cd-alert-banner">
          <AlertTriangle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
          <div className="cd-alert-banner-text">
            <div className="cd-alert-banner-title">Tienes pagos vencidos</div>
            Regulariza tu cuenta para evitar interrupciones en tus pedidos activos.
          </div>
          <button className="cd-btn-primary cd-btn-danger">Pagar Ahora</button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="cd-tabs">
        {TABS.map(t => (
          <button
            key={t}
            className={`cd-tab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'Pagos' && <CreditCard size={14} style={{ marginRight: '.4rem' }} />}
            {t === 'Facturas CFDI' && <FileText size={14} style={{ marginRight: '.4rem' }} />}
            {t}
            {t === 'Facturas CFDI' && (
              <span className="cfdi-tab-badge">{MOCK_CFDIS.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB: PAGOS
      ══════════════════════════════════════════════════════════════ */}
      {tab === 'Pagos' && (
        <>
          <div className="cd-filter-pills" style={{ marginBottom: '1.25rem' }}>
            {PAY_FILTERS.map(f => (
              <button key={f} className={`cd-pill${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
            <table className="cd-table">
              <thead>
                <tr>
                  <th>Factura / Referencia</th>
                  <th>Tipo</th>
                  <th>Monto</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>No hay registros.</td></tr>
                )}
                {filtered.map(p => {
                  const st = STATUS_MAP[p.status] || { label: p.status, badge: 'gray', icon: Clock };
                  const Icon = st.icon;
                  const isPaid = p.status === 'PAID';
                  const isOverdue = p.status === 'OVERDUE';
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="cd-invoice-id">{p.invoiceNumber}</div>
                        <div className="cd-invoice-desc">{TYPE_MAP[p.type] || p.type} — {p.order?.orderNumber}</div>
                        <div className="cd-invoice-order">
                          <span>🔗</span>
                          <Link to={`/client/orders/${p.order?.id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{p.order?.orderNumber}</Link>
                        </div>
                      </td>
                      <td><span className={`cd-chip ${p.type === 'DEPOSIT' ? 'deposit' : p.type === 'BALANCE' ? 'balance' : 'full'}`}>{TYPE_MAP[p.type] || p.type}</span></td>
                      <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtMoney(p.amount)}</td>
                      <td style={{ fontSize: '.82rem', color: isOverdue ? '#dc2626' : '#374151', whiteSpace: 'nowrap' }}>
                        {isPaid ? `Pagado: ${fmtDate(p.paidAt)}` : `Vence: ${fmtDate(p.dueDate)}`}
                      </td>
                      <td>
                        <span className={`cd-badge ${st.badge} no-dot`} style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem' }}>
                          <Icon size={12} /> {st.label}
                        </span>
                      </td>
                      <td>
                        {isPaid ? (
                          <div style={{ display: 'flex', gap: '.5rem' }}>
                            <button className="cd-btn-ghost" style={{ padding: '.35rem .7rem', fontSize: '.78rem' }}><FileText size={12} /> Ver CFDI</button>
                            <button className="cd-btn-ghost" style={{ padding: '.35rem .7rem', fontSize: '.78rem' }}>PDF</button>
                          </div>
                        ) : (
                          <button
                            className={`cd-btn-primary${isOverdue ? ' cd-btn-danger' : ''}`}
                            style={{ padding: '.4rem .9rem', fontSize: '.82rem' }}
                            disabled={payingId === p.id}
                            onClick={() => handlePay(p.id)}
                          >
                            {payingId === p.id ? '...' : 'Pagar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB: FACTURAS CFDI
      ══════════════════════════════════════════════════════════════ */}
      {tab === 'Facturas CFDI' && (
        <div className="cfdi-section">

          {/* Info banner */}
          <div className="cfdi-info-banner">
            <Info size={15} style={{ color: '#2563eb', flexShrink: 0, marginTop: '.1rem' }} />
            <div>
              <div className="cfdi-banner-title">Comprobantes Fiscales Digitales por Internet (CFDI 4.0)</div>
              <div className="cfdi-banner-sub">
                Aquí encontrarás todas tus facturas timbradas ante el SAT. Cada comprobante incluye UUID, datos fiscales del emisor y receptor, partidas, importes e IVA.
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="cfdi-search-wrap" style={{ marginBottom: '1rem' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" className="rfq-search-icon">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              className="rfq-search"
              placeholder="Buscar por folio, pedido o referencia de pago..."
              value={cfdiSearch}
              onChange={e => setCfdiSearch(e.target.value)}
            />
          </div>

          {/* CFDI list */}
          <div className="cfdi-list">
            {cfdiFiltered.length === 0 && (
              <div className="cd-empty">
                <div className="cd-empty-icon"><FileText size={22} /></div>
                <p className="cd-empty-text">No se encontraron facturas.</p>
              </div>
            )}
            {cfdiFiltered.map(cfdi => (
              <CFDICard key={cfdi.id} cfdi={cfdi} onVer={setCfdiModal} />
            ))}
          </div>

          {/* Totals bar */}
          <div className="cfdi-totals-bar">
            <div className="cfdi-total-cell">
              <div className="cfdi-total-label">total emitido (sin IVA)</div>
              <div className="cfdi-total-value">{fmtMoney(cfdiTotals.sin)} MXN</div>
            </div>
            <div className="cfdi-total-cell">
              <div className="cfdi-total-label">IVA total</div>
              <div className="cfdi-total-value">{fmtMoney(cfdiTotals.iva)} MXN</div>
            </div>
            <div className="cfdi-total-cell highlight">
              <div className="cfdi-total-label">Total con IVA</div>
              <div className="cfdi-total-value large">{fmtMoney(cfdiTotals.total)} MXN</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation Modal ── */}
      {confirmId !== null && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '2rem 2.5rem',
            boxShadow: '0 20px 60px rgba(0,0,0,.2)', maxWidth: 380, width: '90%', textAlign: 'center',
          }}>
            <CreditCard size={36} style={{ color: '#2563eb', marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 .5rem', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
              Confirmar Pago
            </h3>
            <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '.9rem' }}>
              ¿Deseas marcar este pago como realizado? (Flujo simulado)
            </p>
            <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center' }}>
              <button
                className="cd-btn-ghost"
                style={{ padding: '.5rem 1.25rem' }}
                onClick={() => setConfirmId(null)}
              >
                Cancelar
              </button>
              <button
                className="cd-btn-primary"
                style={{ padding: '.5rem 1.25rem' }}
                onClick={confirmPay}
                disabled={payingId !== null}
              >
                {payingId !== null ? 'Procesando...' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CFDI Viewer Modal ── */}
      <CFDIModal cfdi={cfdiModal} onClose={() => setCfdiModal(null)} />
    </div>
  );
}
