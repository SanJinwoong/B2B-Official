/**
 * RegistrationSuccess.jsx
 *
 * Pantalla de éxito post-registro. Se muestra cuando el backend devuelve 201.
 *
 * Muestra:
 *  - Ícono de éxito contundente (CheckCircle de lucide-react)
 *  - ID de seguimiento (cuid) con botón "Copiar al portapapeles"
 *  - Aviso de correo enviado (simulado)
 *  - Link a "Consultar Estado" con el ID pre-rellenado
 */

import { useState } from 'react';
import { Link }     from 'react-router-dom';
import { CheckCircle, Copy, Check, Mail, Search, ArrowRight, RotateCcw } from 'lucide-react';

const RegistrationSuccess = ({ applicationId, companyName, contactEmail, onReset }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(applicationId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback para navegadores sin Clipboard API
      const ta = document.createElement('textarea');
      ta.value = applicationId;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div className="rs-page">
      <div className="rs-card">

        {/* Ícono de éxito */}
        <div className="rs-icon-wrap">
          <div className="rs-icon-circle">
            <CheckCircle size={42} strokeWidth={1.5} />
          </div>
        </div>

        {/* Título */}
        <h1 className="rs-title">¡Solicitud Enviada!</h1>
        <p className="rs-subtitle">
          {companyName
            ? <><strong>{companyName}</strong> — tu solicitud ha sido recibida y está en revisión.</>
            : 'Tu solicitud ha sido recibida y está en revisión.'}
        </p>

        {/* ID de seguimiento */}
        <div className="rs-id-box">
          <p className="rs-id-label">ID de Seguimiento</p>
          <div className="rs-id-row">
            <code className="rs-id-value">{applicationId}</code>
            <button
              className={`rs-copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
              title="Copiar ID al portapapeles"
            >
              {copied
                ? <><Check size={14} strokeWidth={2.5} /> Copiado</>
                : <><Copy size={14} /> Copiar</>}
            </button>
          </div>
          <p className="rs-id-hint">
            Guarda este ID. Lo necesitarás para consultar el estado de tu solicitud en cualquier momento.
          </p>
        </div>

        {/* Aviso de correo */}
        <div className="rs-mail-notice">
          <Mail size={16} className="rs-mail-icon" />
          <div>
            <p className="rs-mail-title">Comprobante enviado por correo</p>
            <p className="rs-mail-sub">
              Enviamos un correo de confirmación con el ID de seguimiento a{' '}
              <strong>{contactEmail || 'tu dirección de correo'}</strong>.
              Si no lo encuentras, revisa tu carpeta de spam.
            </p>
          </div>
        </div>

        {/* Pasos del proceso */}
        <div className="rs-steps-info">
          <p className="rs-steps-label">¿Qué sigue?</p>
          <div className="rs-step-list">
            <div className="rs-step-item rs-step-done">
              <div className="rs-step-dot"><Check size={12} strokeWidth={3} /></div>
              <div>
                <p className="rs-step-name">Registro completado</p>
                <p className="rs-step-desc">Tu información y documentos fueron enviados correctamente.</p>
              </div>
            </div>
            <div className="rs-step-item rs-step-active">
              <div className="rs-step-dot rs-dot-active">2</div>
              <div>
                <p className="rs-step-name">Verificación de documentos</p>
                <p className="rs-step-desc">Nuestro equipo revisará tu documentación. Plazo: 2–5 días hábiles.</p>
              </div>
            </div>
            <div className="rs-step-item rs-step-pending">
              <div className="rs-step-dot rs-dot-pending">3</div>
              <div>
                <p className="rs-step-name">Evaluación del perfil</p>
                <p className="rs-step-desc">Evaluamos tu capacidad y categoría de productos.</p>
              </div>
            </div>
            <div className="rs-step-item rs-step-pending">
              <div className="rs-step-dot rs-dot-pending">4</div>
              <div>
                <p className="rs-step-name">Cuenta activa</p>
                <p className="rs-step-desc">Recibirás tus credenciales y accederás a RFQs de clientes.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="rs-actions">
          <Link
            to={`/estado-solicitud?id=${applicationId}&email=${encodeURIComponent(contactEmail || '')}`}
            className="rs-btn-primary"
          >
            <Search size={15} />
            Consultar Estado
            <ArrowRight size={15} />
          </Link>
          <button className="rs-btn-ghost" onClick={onReset}>
            <RotateCcw size={14} />
            Registrar otra empresa
          </button>
        </div>

      </div>
    </div>
  );
};

export default RegistrationSuccess;
