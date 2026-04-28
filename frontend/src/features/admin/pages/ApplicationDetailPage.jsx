/**
 * ApplicationDetailPage.jsx
 *
 * Vista de detalle de una solicitud de proveedor con máquina de estados.
 *
 * REGLA DEL LOCK:
 *   - status === 'PENDING'   → Solo "Tomar Caso" (PATCH /claim). Sin decisiones.
 *   - status === 'REVIEWING' y reviewerId !== user.id → Lock warning. Sin botones.
 *   - status === 'REVIEWING' y reviewerId === user.id → Botones: Aprobar, Cambios, Rechazar.
 *   - status final (APPROVED/REJECTED) → Solo lectura.
 *   - status === 'ACTION_REQUIRED' → Esperando corrección del prospecto.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate }          from 'react-router-dom';
import { useAuth }                         from '../../../context/AuthContext';
import { adminApi }                        from '../../../api/api';
import StatusBadge                         from '../components/StatusBadge';
import DocumentViewer                      from '../components/DocumentViewer';
import ReviewModal                         from '../components/ReviewModal';
import '../admin-applications.css';

const fmt = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
};

const ApplicationDetailPage = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [app,          setApp]          = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [actionLoading,setActionLoading]= useState(false);
  const [actionError,  setActionError]  = useState('');
  const [viewingDoc,   setViewingDoc]   = useState(null); // doc abierto en el visor

  // Modal
  const [modalOpen,   setModalOpen]   = useState(false);
  const [modalAction, setModalAction] = useState(null);

  // ── Cargar solicitud ────────────────────────────────────────────────────
  const loadApp = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminApi.getApplication(id);
      setApp(data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'No se pudo cargar la solicitud.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadApp(); }, [loadApp]);

  // ── Tomar caso (PENDING → REVIEWING) ────────────────────────────────────
  const handleClaim = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      const { data } = await adminApi.claimApplication(id);
      setApp(data.data);
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'No se pudo tomar el caso.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Abrir modal con el tipo de acción seleccionada ───────────────────────
  const openModal = (actionType) => {
    setModalAction(actionType);
    setActionError('');
    setModalOpen(true);
  };

  // ── Ejecutar la decisión del admin (desde el modal) ────────────────────
  const handleModalConfirm = async (actionNote) => {
    setActionLoading(true);
    setActionError('');
    try {
      let response;
      if (modalAction === 'APPROVED') {
        response = await adminApi.approveApplication(id);
      } else if (modalAction === 'REJECTED') {
        response = await adminApi.rejectApplication(id, actionNote);
      } else if (modalAction === 'ACTION_REQUIRED') {
        response = await adminApi.requestAction(id, actionNote);
      }

      setModalOpen(false);
      // Recargar la solicitud para reflejar el nuevo estado
      setApp(response.data.data?.application ?? response.data.data);
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Error al procesar la acción.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Derivar estado del lock ──────────────────────────────────────────────
  const isMine   = app?.reviewerId === user?.id;
  const isLocked = app?.status === 'REVIEWING' && !isMine;
  const canAct   = app?.status === 'REVIEWING' && isMine;
  const isFinal  = ['APPROVED', 'REJECTED'].includes(app?.status);

  // ── Loading / Error global ───────────────────────────────────────────────
  if (loading) return (
    <div className="aa-layout">
      <div className="aa-loading" style={{ minHeight: '100vh' }}>
        <span className="aa-spinner" /> Cargando solicitud...
      </div>
    </div>
  );

  if (error) return (
    <div className="aa-layout">
      <div className="aa-content" style={{ paddingTop: '3rem' }}>
        <div className="aa-error-box">{error}</div>
        <button className="aa-btn aa-btn-ghost" onClick={() => navigate('/admin/applications')}>
          ← Volver a la lista
        </button>
      </div>
    </div>
  );

  return (
    <div className="aa-layout">

      <main className="aa-content">

        {/* Back */}
        <button className="aa-back-btn" onClick={() => navigate('/admin/applications')}>
          ← Volver a solicitudes
        </button>

        {/* Page header */}
        <div className="aa-page-header">
          <div>
            <h1 className="aa-page-title">{app.companyName}</h1>
            <p className="aa-page-subtitle">RFC: {app.rfc} · {app.city}, {app.state}, {app.country}</p>
          </div>
          <StatusBadge status={app.status} />
        </div>

        {/* Grid principal */}
        <div className="aa-detail-grid">

          {/* ── Columna izquierda — información ── */}
          <div className="aa-detail-main">

            {/* Datos de la empresa */}
            <section className="aa-section">
              <p className="aa-section-title">Información de la Empresa</p>
              <div className="aa-info-grid">
                <div className="aa-info-item">
                  <label>Razón Social</label>
                  <p>{app.companyName}</p>
                </div>
                <div className="aa-info-item">
                  <label>RFC</label>
                  <p>{app.rfc}</p>
                </div>
                <div className="aa-info-item">
                  <label>Categoría</label>
                  <p style={{ textTransform: 'capitalize' }}>{app.category}</p>
                </div>
                <div className="aa-info-item">
                  <label>Sitio Web</label>
                  {app.website
                    ? <a href={app.website} target="_blank" rel="noreferrer"                     style={{ color: 'var(--accent)', fontSize: '0.88rem' }}>{app.website}</a>
                    : <p className="empty">No especificado</p>}
                </div>
                <div className="aa-info-item">
                  <label>Ubicación</label>
                  <p>{app.city}, {app.state}</p>
                </div>
                <div className="aa-info-item">
                  <label>País</label>
                  <p>{app.country}</p>
                </div>
                {app.address && (
                  <div className="aa-info-item" style={{ gridColumn: '1 / -1' }}>
                    <label>Dirección</label>
                    <p>{app.address}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Contacto */}
            <section className="aa-section">
              <p className="aa-section-title">Contacto Principal</p>
              <div className="aa-info-grid">
                <div className="aa-info-item">
                  <label>Nombre</label>
                  <p>{app.contactName}</p>
                </div>
                <div className="aa-info-item">
                  <label>Email</label>
                  <p>{app.contactEmail}</p>
                </div>
                <div className="aa-info-item">
                  <label>Teléfono</label>
                  <p>{app.contactPhone}</p>
                </div>
              </div>
            </section>

            {/* Capacidad */}
            <section className="aa-section">
              <p className="aa-section-title">Capacidad de Producción</p>
              <div className="aa-info-grid">
                <div className="aa-info-item">
                  <label>Capacidad Mensual</label>
                  <p>{Number(app.monthlyCapacity).toLocaleString()} {app.capacityUnit}</p>
                </div>
                <div className="aa-info-item">
                  <label>Lead Time Promedio</label>
                  <p>{app.leadTimeDays} días</p>
                </div>
                <div className="aa-info-item">
                  <label>Experiencia Exportación</label>
                  <p>{app.hasExportExp ? '✅ Sí' : '❌ No'}</p>
                </div>
              </div>
              {app.description && (
                <div style={{ marginTop: '1rem' }}>
                  <label                     style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>
                    Descripción
                  </label>
                   <p style={{ fontSize: '0.87rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{app.description}</p>
                </div>
              )}
              {app.certifications?.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <label                    style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                    Certificaciones
                  </label>
                  <div className="aa-cert-list">
                    {app.certifications.map((c) => <span key={c} className="aa-cert-tag">{c}</span>)}
                  </div>
                </div>
              )}
            </section>

            {/* Documentos */}
            <section className="aa-section">
              <p className="aa-section-title">Documentos ({app.documents?.length ?? 0})</p>
              {app.documents?.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)' }}>Sin documentos adjuntos.</p>
              ) : (
                <div className="aa-doc-list">
                  {app.documents?.map((doc) => (
                    <div
                      key={doc.id}
                      className="aa-doc-item"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setViewingDoc(doc)}
                      title="Haz clic para previsualizar"
                    >
                      <span className="aa-doc-icon">
                        {doc.mimeType?.startsWith('image/') ? '🖼' : '📑'}
                      </span>
                      <div className="aa-doc-info">
                        <p className="aa-doc-name">{doc.originalName}</p>
                        <p className="aa-doc-size">{doc.label}</p>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>Ver →</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Auditoría */}
            <section className="aa-section">
              <p className="aa-section-title">Auditoría</p>
              <div className="aa-info-grid">
                <div className="aa-info-item">
                  <label>Fecha de Solicitud</label>
                  <p>{fmtDate(app.createdAt)}</p>
                </div>
                <div className="aa-info-item">
                  <label>Última Actualización</label>
                  <p>{fmt(app.updatedAt)}</p>
                </div>
                {app.reviewer && (
                  <div className="aa-info-item">
                    <label>Revisor Asignado</label>
                    <p>{app.reviewer.name}</p>
                  </div>
                )}
                {app.reviewStartedAt && (
                  <div className="aa-info-item">
                    <label>Revisión Iniciada</label>
                    <p>{fmt(app.reviewStartedAt)}</p>
                  </div>
                )}
                {app.reviewedAt && (
                  <div className="aa-info-item">
                    <label>Decisión Tomada</label>
                    <p>{fmt(app.reviewedAt)}</p>
                  </div>
                )}
                {app.captchaScore != null && (
                  <div className="aa-info-item">
                    <label>Score Captcha</label>
                    <p>{app.captchaScore}</p>
                  </div>
                )}
              </div>
            </section>

          </div>

          {/* ── Columna derecha — panel de decisión ── */}
          <aside className="aa-sidebar">
            <div className="aa-action-card">
              <p className="aa-action-title">Panel de Decisión</p>

              {/* Estado actual */}
              <div className="aa-status-row">
                <span className="aa-status-label">Estado actual</span>
                <StatusBadge status={app.status} />
              </div>

              {/* Error de acción */}
              {actionError && <div className="aa-error-box">{actionError}</div>}

              {/* ─── PENDING: solo botón de tomar caso ─── */}
              {app.status === 'PENDING' && (
                <>
                  <div className="aa-lock-info">
                    <span>🔓</span>
                    <span>Toma este caso para comenzar la revisión y bloquear la solicitud mientras la evalúas.</span>
                  </div>
                  <div className="aa-action-btns">
                    <button
                      className="aa-btn aa-btn-primary"
                      style={{ width: '100%' }}
                      onClick={handleClaim}
                      disabled={actionLoading}
                    >
                      {actionLoading
                        ? <><span className="aa-spinner" /> Tomando caso...</>
                        : '🔒 Tomar Caso para Revisión'}
                    </button>
                  </div>
                </>
              )}

              {/* ─── REVIEWING: lock ocupado por otro admin ─── */}
              {isLocked && (
                <div className="aa-lock-info warning">
                  <span>🔒</span>
                  <span>
                    Este caso está siendo revisado por <strong>{app.reviewer?.name}</strong> desde {fmt(app.reviewStartedAt)}.
                    No puedes modificarlo.
                  </span>
                </div>
              )}

              {/* ─── REVIEWING: el admin actual tiene el lock ─── */}
              {canAct && (
                <>
                  <div className="aa-lock-info">
                    <span>🔒</span>
                    <span>Tienes el lock de revisión desde {fmt(app.reviewStartedAt)}.</span>
                  </div>
                  <div className="aa-action-btns">
                    <button
                      className="aa-btn aa-btn-success"
                      style={{ width: '100%' }}
                      onClick={() => openModal('APPROVED')}
                      disabled={actionLoading}
                    >
                      ✅ Aprobar Proveedor
                    </button>
                    <button
                      className="aa-btn aa-btn-warn"
                      style={{ width: '100%' }}
                      onClick={() => openModal('ACTION_REQUIRED')}
                      disabled={actionLoading}
                    >
                      ⚠️ Solicitar Cambios
                    </button>
                    <button
                      className="aa-btn aa-btn-danger"
                      style={{ width: '100%' }}
                      onClick={() => openModal('REJECTED')}
                      disabled={actionLoading}
                    >
                      ✕ Rechazar Solicitud
                    </button>
                  </div>
                </>
              )}

              {/* ─── ACTION_REQUIRED: esperando corrección ─── */}
              {app.status === 'ACTION_REQUIRED' && (
                <>
                  {app.actionNote && (
                    <div className="aa-action-note-box">
                      <strong>Motivo enviado al prospecto:</strong>
                      {app.actionNote}
                    </div>
                  )}
                  <div className="aa-lock-info">
                    <span>⏳</span>
                    <span>En espera de corrección por parte del prospecto. Cuando envíe su corrección, el estado regresará a PENDING.</span>
                  </div>
                </>
              )}

              {/* ─── APPROVED: solo lectura ─── */}
              {app.status === 'APPROVED' && (
                <div className="aa-lock-info" style={{ background: 'var(--success-bg)', borderColor: 'rgba(22,163,74,.2)' }}>
                  <span>✅</span>
                  <div>
                    <p style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.85rem' }}>Solicitud aprobada</p>
                    {app.approvedUser && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Cuenta creada: {app.approvedUser.email}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ─── REJECTED: solo lectura ─── */}
              {app.status === 'REJECTED' && (
                <>
                  {app.actionNote && (
                    <div className="aa-action-note-box">
                      <strong>Motivo de rechazo:</strong>
                      {app.actionNote}
                    </div>
                  )}
                  <div className="aa-lock-info warning">
                    <span>✕</span>
                    <span>Solicitud rechazada definitivamente. No puede ser revertida.</span>
                  </div>
                </>
              )}

            </div>
          </aside>
        </div>
      </main>

      {/* Modal de decisión */}
      <ReviewModal
        open={modalOpen}
        actionType={modalAction}
        loading={actionLoading}
        serverError={actionError}
        onConfirm={handleModalConfirm}
        onClose={() => { setModalOpen(false); setActionError(''); }}
      />

      {/* Visor de documentos autenticado */}
      <DocumentViewer
        doc={viewingDoc}
        token={token}
        onClose={() => setViewingDoc(null)}
      />
    </div>
  );
};

export default ApplicationDetailPage;
