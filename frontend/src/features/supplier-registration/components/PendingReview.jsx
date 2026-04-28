/** Vista "Perfil en Revisión" que se muestra tras un submit exitoso */
const PendingReview = ({ applicationId, onReset }) => (
  <div className="sr-pending-page">
    <div className="sr-pending-card">

      {/* Logo con badge de tiempo */}
      <div className="sr-pending-logo">
        <svg width="32" height="32" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
        </svg>
        <div className="sr-pending-badge">⏱</div>
      </div>

      <h1 className="sr-pending-title">Perfil en Revisión</h1>
      <p className="sr-pending-subtitle">
        Tu solicitud de registro ha sido recibida exitosamente.<br />
        Nuestro equipo la está evaluando.
      </p>

      {/* Estado actual */}
      <div className="sr-status-alert">
        <span style={{ fontSize: '1.1rem' }}>🕐</span>
        <div>
          <strong>Tu perfil está siendo evaluado</strong>
          Tiempo estimado: 2-5 días hábiles
        </div>
      </div>

      {/* Progreso de verificación */}
      <div className="sr-progress-section">
        <p className="sr-progress-label">PROGRESO DE VERIFICACIÓN</p>
        <div className="sr-progress-steps">
          <div className="sr-progress-step">
            <div className="sr-progress-dot done">✓</div>
            <div className="sr-progress-info">
              <p className="sr-progress-step-title">
                Registro Completado
                <span className="sr-progress-step-badge badge-done">Completado</span>
              </p>
              <p className="sr-progress-step-desc">Tu información y documentos fueron enviados correctamente.</p>
            </div>
          </div>
          <div className="sr-progress-step">
            <div className="sr-progress-dot active">⟳</div>
            <div className="sr-progress-info">
              <p className="sr-progress-step-title">
                Verificación de Documentos
                <span className="sr-progress-step-badge badge-active">En proceso</span>
              </p>
              <p className="sr-progress-step-desc">Nuestro equipo está revisando tu documentación fiscal y certificaciones.</p>
            </div>
          </div>
          <div className="sr-progress-step">
            <div className="sr-progress-dot pending">3</div>
            <div className="sr-progress-info">
              <p className="sr-progress-step-title">Evaluación del Perfil</p>
              <p className="sr-progress-step-desc">Evaluamos tu capacidad de producción y categoría de productos.</p>
            </div>
          </div>
          <div className="sr-progress-step">
            <div className="sr-progress-dot pending">4</div>
            <div className="sr-progress-info">
              <p className="sr-progress-step-title">Cuenta Activa</p>
              <p className="sr-progress-step-desc">Recibirás un correo de aprobación y podrás comenzar a recibir RFQs.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Qué sigue */}
      <div className="sr-whats-next">
        <p className="sr-whats-next-title">¿QUÉ SIGUE?</p>
        <div className="sr-whats-next-items">
          <div className="sr-whats-next-item">
            <span>📧</span>
            <span>Recibirás un correo electrónico con el resultado de tu evaluación.</span>
          </div>
          <div className="sr-whats-next-item">
            <span>📞</span>
            <span>Un gestor puede contactarte para validar documentación adicional.</span>
          </div>
          <div className="sr-whats-next-item">
            <span>✅</span>
            <span>Si eres aprobado, accederás inmediatamente a recibir RFQs de clientes.</span>
          </div>
        </div>
      </div>

      {/* ID de seguimiento */}
      {applicationId && (
        <p style={{ fontSize: '0.78rem', color: 'var(--sr-text-subtle)', marginBottom: '1rem', wordBreak: 'break-all' }}>
          ID de seguimiento: <span style={{ color: 'var(--sr-text-muted)', fontFamily: 'monospace' }}>{applicationId}</span>
        </p>
      )}

      {/* Acción de reset */}
      <button className="sr-btn sr-btn-ghost" style={{ width: '100%' }} onClick={onReset}>
        Volver al Registro
      </button>

      <p className="sr-back-link">
        ¿Tienes dudas? Escríbenos a{' '}
        <a href="mailto:proveedores@b2bplatform.com">proveedores@b2bplatform.com</a>
      </p>
    </div>
  </div>
);

export default PendingReview;
