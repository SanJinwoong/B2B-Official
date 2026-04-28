/**
 * ReviewModal.jsx
 *
 * Modal unificado para las 3 acciones de decisión del admin:
 *   - APPROVED        → Sin textarea. Solo confirmación.
 *   - ACTION_REQUIRED → Textarea obligatorio (min 10 chars).
 *   - REJECTED        → Textarea obligatorio (min 10 chars).
 *
 * El botón de envío queda bloqueado si la acción requiere nota y está vacía.
 */

import { useState, useEffect, useRef } from 'react';

const ACTION_CONFIG = {
  APPROVED: {
    title:       '✅ Confirmar Aprobación',
    subtitle:    'El proveedor será aprobado y recibirá sus credenciales de acceso.',
    btnLabel:    'Aprobar Proveedor',
    btnClass:    'aa-btn-success',
    requireNote: false,
    warning:     '📧 Se generarán credenciales temporales y se enviarán al correo del proveedor. Esta acción no se puede deshacer.',
    warningCls:  '',
  },
  ACTION_REQUIRED: {
    title:       '⚠️ Solicitar Corrección',
    subtitle:    'El prospecto recibirá un correo con un enlace de corrección válido por 72 horas.',
    btnLabel:    'Enviar Solicitud de Cambios',
    btnClass:    'aa-btn-warn',
    requireNote: true,
    warning:     null,
    warningCls:  '',
  },
  REJECTED: {
    title:       '✕ Rechazar Solicitud',
    subtitle:    'Esta acción es definitiva. El prospecto será notificado por correo.',
    btnLabel:    'Rechazar Definitivamente',
    btnClass:    'aa-btn-danger',
    requireNote: true,
    warning:     '⚠️ Esta decisión es irreversible. La solicitud quedará marcada como RECHAZADA permanentemente.',
    warningCls:  'danger',
  },
};

/**
 * @param {boolean}  open         - Si el modal es visible
 * @param {string}   actionType   - 'APPROVED' | 'ACTION_REQUIRED' | 'REJECTED'
 * @param {boolean}  loading      - Si la petición está en curso
 * @param {string}   serverError  - Error devuelto por el backend
 * @param {Function} onConfirm    - (actionNote: string) => void
 * @param {Function} onClose      - () => void
 */
const ReviewModal = ({ open, actionType, loading, serverError, onConfirm, onClose }) => {
  const [note, setNote]       = useState('');
  const [touched, setTouched] = useState(false);
  const textareaRef           = useRef(null);

  // Limpiar nota al abrir/cambiar acción
  useEffect(() => {
    if (open) {
      setNote('');
      setTouched(false);
      // Focus al textarea si la acción lo requiere
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [open, actionType]);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && open && !loading) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, loading, onClose]);

  if (!open || !actionType) return null;

  const cfg          = ACTION_CONFIG[actionType];
  const noteInvalid  = cfg.requireNote && note.trim().length < 10;
  const canSubmit    = !noteInvalid && !loading;

  const handleConfirm = () => {
    if (!canSubmit) { setTouched(true); return; }
    onConfirm(note.trim());
  };

  // Click fuera del modal → cerrar (si no está cargando)
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !loading) onClose();
  };

  return (
    <div className="aa-modal-overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <div className="aa-modal">

        {/* Cabecera */}
        <h2 className="aa-modal-title">{cfg.title}</h2>
        <p className="aa-modal-subtitle">{cfg.subtitle}</p>

        {/* Advertencia de aprobación o rechazo */}
        {cfg.warning && (
          <div className={`aa-modal-warning ${cfg.warningCls}`}>
            <span style={{ flexShrink: 0 }}>{cfg.warningCls === 'danger' ? '🚨' : '📬'}</span>
            <span>{cfg.warning}</span>
          </div>
        )}

        {/* Textarea para nota (solo si es ACTION_REQUIRED o REJECTED) */}
        {cfg.requireNote && (
          <>
            <label className="aa-modal-label">
              Motivo / Instrucciones <span>*</span>
              <span style={{ fontWeight: 400, color: 'var(--aa-text-subtle)', marginLeft: '0.35rem' }}>
                (mínimo 10 caracteres)
              </span>
            </label>
            <textarea
              ref={textareaRef}
              className={`aa-modal-textarea ${touched && noteInvalid ? 'error' : ''}`}
              placeholder={
                actionType === 'ACTION_REQUIRED'
                  ? 'Ej: El RFC no coincide con los datos del Acta Constitutiva. Por favor sube una copia actualizada...'
                  : 'Ej: La empresa no cumple con los requisitos mínimos de capacidad productiva para nuestra red...'
              }
              value={note}
              onChange={(e) => { setNote(e.target.value); setTouched(true); }}
              maxLength={1000}
            />
            <p className="aa-modal-char-count">{note.length}/1000</p>

            {touched && noteInvalid && (
              <p style={{ fontSize: '0.8rem', color: 'var(--s-rejected)', marginTop: '-1rem', marginBottom: '1rem' }}>
                ⚠ El motivo debe tener al menos 10 caracteres.
              </p>
            )}
          </>
        )}

        {/* Error del servidor */}
        {serverError && (
          <div className="aa-error-box" style={{ marginBottom: '1rem' }}>
            ⚠ {serverError}
          </div>
        )}

        {/* Footer con botones */}
        <div className="aa-modal-footer">
          <button className="aa-btn aa-btn-ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            className={`aa-btn ${cfg.btnClass}`}
            onClick={handleConfirm}
            disabled={!canSubmit}
          >
            {loading ? <><span className="aa-spinner" /> Procesando...</> : cfg.btnLabel}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ReviewModal;
