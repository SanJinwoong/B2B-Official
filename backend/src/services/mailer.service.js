/**
 * mailer.service.js — Resend (correo transaccional real)
 *
 * Envía correos HTML reales vía la API de Resend.
 * Si el envío falla (correo inválido, rate limit, etc.) el error
 * se logea en terminal pero NUNCA interrumpe el flujo principal.
 *
 * Variables de entorno requeridas:
 *   RESEND_API_KEY  — API Key de Resend
 *   RESEND_FROM     — Dirección remitente (ej: onboarding@resend.dev)
 *   FRONTEND_URL    — URL base del frontend (ej: http://localhost:5173)
 */

const { Resend } = require('resend');

const FROM     = process.env.RESEND_FROM  || 'onboarding@resend.dev';
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';

// ── Helper: envío seguro (nunca lanza excepción al caller) ─────────────────────
// El cliente se crea de forma lazy para que un RESEND_API_KEY ausente
// solo genere un warning en consola, no un crash al arrancar el servidor.
const safeSend = async (payload) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Mailer] ⚠️  RESEND_API_KEY no configurada — correo simulado (mock):');
    console.warn('[Mailer]    Para:', payload.to);
    console.warn('[Mailer]    Asunto:', payload.subject);
    return;
  }
  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send(payload);
    if (error) {
      console.error('[Mailer] Resend error:', error);
    } else {
      console.log(`[Mailer] ✅ Correo enviado a ${payload.to} (id: ${data?.id})`);
    }
  } catch (err) {
    console.error('[Mailer] Error inesperado al enviar correo:', err.message);
  }
};

// ── Estilos base para los correos HTML ────────────────────────────────────────
const baseStyle = `
  font-family: 'Segoe UI', Arial, sans-serif;
  max-width: 560px;
  margin: 0 auto;
  background: #f8fafc;
  border-radius: 12px;
  overflow: hidden;
`;

const headerStyle = (bg = '#2563eb') => `
  background: ${bg};
  padding: 32px 40px;
  text-align: center;
`;

const bodyStyle = `
  padding: 32px 40px;
  background: #ffffff;
  color: #1e293b;
  line-height: 1.6;
`;

const footerStyle = `
  padding: 20px 40px;
  background: #f1f5f9;
  text-align: center;
  font-size: 12px;
  color: #64748b;
`;

const btnStyle = (color = '#2563eb') => `
  display: inline-block;
  margin-top: 20px;
  padding: 14px 28px;
  background: ${color};
  color: #ffffff;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 15px;
`;

const pillStyle = (color = '#2563eb') => `
  display: inline-block;
  background: ${color}15;
  color: ${color};
  border: 1px solid ${color}40;
  border-radius: 8px;
  padding: 8px 16px;
  font-family: monospace;
  font-size: 14px;
  word-break: break-all;
  margin: 8px 0;
`;

// ══════════════════════════════════════════════════════════════════════════════
// 1. Confirmación de recepción de solicitud
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Se envía al prospecto justo después de que su registro fue recibido.
 * @param {string} email         - Correo del prospecto
 * @param {string} applicationId - ID de seguimiento (cuid)
 */
const sendSubmissionConfirmation = (email, applicationId) => {
  const statusUrl = `${FRONTEND}/estado-solicitud?id=${applicationId}&email=${encodeURIComponent(email)}`;

  console.log(`[Mailer] Enviando confirmación de registro a ${email}...`);
  console.log(`[Mailer] ID de seguimiento: ${applicationId}`);

  safeSend({
    from: FROM,
    to:   email,
    subject: 'B2B Platform — Tu solicitud fue recibida ✅',
    html: `
      <div style="${baseStyle}">
        <div style="${headerStyle('#2563eb')}">
          <h1 style="color:#fff;margin:0;font-size:22px;">🏢 B2B Platform</h1>
          <p style="color:#bfdbfe;margin:8px 0 0;font-size:14px;">Registro de Proveedores</p>
        </div>
        <div style="${bodyStyle}">
          <h2 style="margin-top:0;color:#1e40af;">¡Solicitud recibida!</h2>
          <p>Tu solicitud de registro como proveedor ha sido recibida exitosamente y está en cola de revisión.</p>

          <p><strong>Guarda tu clave de seguimiento:</strong></p>
          <div style="${pillStyle('#2563eb')}">${applicationId}</div>

          <p>Con este ID puedes consultar el estado de tu solicitud en cualquier momento.</p>

          <p><strong>Tiempo estimado de revisión:</strong> 2–5 días hábiles.</p>

          <a href="${statusUrl}" style="${btnStyle('#2563eb')}">
            Ver estado de mi solicitud →
          </a>

          <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;">
          <p style="font-size:13px;color:#64748b;">
            Si no solicitaste este registro, puedes ignorar este correo.
          </p>
        </div>
        <div style="${footerStyle}">
          B2B Platform · Sistema de Registro de Proveedores
        </div>
      </div>
    `,
  });
};

// ══════════════════════════════════════════════════════════════════════════════
// 2. Acción requerida (corrección parcial)
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Se envía cuando el admin solicita correcciones.
 * @param {string} email         - Correo del prospecto
 * @param {string} applicationId - ID de la solicitud
 * @param {string} actionNote    - Motivo documentado por el admin
 * @param {string} actionToken   - Token único de corrección
 */
const sendActionRequired = (email, applicationId, actionNote, actionToken) => {
  const correctionUrl = `${FRONTEND}/correccion/${actionToken}`;
  const statusUrl     = `${FRONTEND}/estado-solicitud?id=${applicationId}&email=${encodeURIComponent(email)}`;

  console.log(`[Mailer] Enviando solicitud de corrección a ${email}...`);
  console.log(`[Mailer] URL de corrección: ${correctionUrl}`);

  safeSend({
    from: FROM,
    to:   email,
    subject: 'B2B Platform — Se requieren cambios en tu solicitud ⚠️',
    html: `
      <div style="${baseStyle}">
        <div style="${headerStyle('#d97706')}">
          <h1 style="color:#fff;margin:0;font-size:22px;">⚠️ B2B Platform</h1>
          <p style="color:#fde68a;margin:8px 0 0;font-size:14px;">Corrección Requerida</p>
        </div>
        <div style="${bodyStyle}">
          <h2 style="margin-top:0;color:#92400e;">Se requieren cambios en tu solicitud</h2>
          <p>El equipo revisó tu solicitud y necesita que realices algunas correcciones antes de continuar.</p>

          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:0;font-weight:600;color:#92400e;">Cambios requeridos:</p>
            <p style="margin:8px 0 0;color:#78350f;">${actionNote}</p>
          </div>

          <p>Haz clic en el botón para corregir tu solicitud. El enlace es de un solo uso y expira en <strong>72 horas</strong>.</p>

          <a href="${correctionUrl}" style="${btnStyle('#d97706')}">
            Corregir mi solicitud →
          </a>

          <p style="margin-top:24px;">
            También puedes consultar el estado de tu solicitud:
            <a href="${statusUrl}" style="color:#2563eb;">Ver estado</a>
          </p>
        </div>
        <div style="${footerStyle}">
          B2B Platform · Si no esperabas este correo, contáctanos.
        </div>
      </div>
    `,
  });
};

// ══════════════════════════════════════════════════════════════════════════════
// 3. Rechazo definitivo
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Se envía cuando el admin rechaza definitivamente la solicitud.
 * @param {string} email      - Correo del prospecto
 * @param {string} actionNote - Motivo del rechazo
 */
const sendRejection = (email, actionNote) => {
  console.log(`[Mailer] Enviando notificación de rechazo a ${email}...`);

  safeSend({
    from: FROM,
    to:   email,
    subject: 'B2B Platform — Resultado de tu solicitud de registro',
    html: `
      <div style="${baseStyle}">
        <div style="${headerStyle('#dc2626')}">
          <h1 style="color:#fff;margin:0;font-size:22px;">B2B Platform</h1>
          <p style="color:#fecaca;margin:8px 0 0;font-size:14px;">Resultado de Solicitud</p>
        </div>
        <div style="${bodyStyle}">
          <h2 style="margin-top:0;color:#991b1b;">Tu solicitud no fue aprobada</h2>
          <p>Lamentablemente tu solicitud de registro como proveedor no cumplió con los requisitos necesarios en esta ocasión.</p>

          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:0;font-weight:600;color:#991b1b;">Motivo:</p>
            <p style="margin:8px 0 0;color:#7f1d1d;">${actionNote}</p>
          </div>

          <p>Si consideras que es un error o tienes preguntas, puedes contactarnos en:</p>
          <p><a href="mailto:proveedores@b2bplatform.com" style="color:#2563eb;">proveedores@b2bplatform.com</a></p>
        </div>
        <div style="${footerStyle}">
          B2B Platform · Sistema de Registro de Proveedores
        </div>
      </div>
    `,
  });
};

// ══════════════════════════════════════════════════════════════════════════════
// 4. Aprobación + credenciales temporales
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Se envía cuando el admin aprueba la solicitud y se crea el User SUPPLIER.
 * @param {string} email        - Correo del nuevo proveedor
 * @param {string} tempPassword - Contraseña temporal (texto plano, pre-hash)
 */
const sendApproval = (email, tempPassword) => {
  const loginUrl = `${FRONTEND}/login`;

  console.log(`[Mailer] Enviando aprobación a ${email}...`);
  console.log(`[Mailer] Contraseña temporal: ${tempPassword}`);

  safeSend({
    from: FROM,
    to:   email,
    subject: 'B2B Platform — ¡Tu cuenta de proveedor fue aprobada! 🎉',
    html: `
      <div style="${baseStyle}">
        <div style="${headerStyle('#16a34a')}">
          <h1 style="color:#fff;margin:0;font-size:22px;">🎉 B2B Platform</h1>
          <p style="color:#bbf7d0;margin:8px 0 0;font-size:14px;">¡Bienvenido como Proveedor Verificado!</p>
        </div>
        <div style="${bodyStyle}">
          <h2 style="margin-top:0;color:#15803d;">¡Felicidades! Tu cuenta fue aprobada</h2>
          <p>Tu empresa ha sido verificada y aprobada como proveedor en B2B Platform. Ya puedes iniciar sesión con las siguientes credenciales:</p>

          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:16px 0;">
            <p style="margin:0 0 8px;color:#166534;"><strong>📧 Usuario (correo):</strong></p>
            <div style="${pillStyle('#16a34a')}">${email}</div>
            <p style="margin:16px 0 8px;color:#166534;"><strong>🔑 Contraseña temporal:</strong></p>
            <div style="${pillStyle('#16a34a')}">${tempPassword}</div>
          </div>

          <p style="color:#dc2626;font-weight:600;">⚠️ Por seguridad, cambia tu contraseña al primer inicio de sesión.</p>

          <a href="${loginUrl}" style="${btnStyle('#16a34a')}">
            Iniciar sesión ahora →
          </a>
        </div>
        <div style="${footerStyle}">
          B2B Platform · Tu cuenta tiene el rol de Proveedor Verificado ✓
        </div>
      </div>
    `,
  });
};

// ══════════════════════════════════════════════════════════════════════════════
// 5. Notificación al admin — corrección del proveedor recibida
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Se envía al admin revisor cuando el proveedor reenvía su solicitud corregida.
 * @param {string} adminEmail    - Correo del admin que revisó originalmente
 * @param {string} applicationId - ID de la solicitud
 * @param {string} companyName   - Nombre de la empresa del proveedor
 */
const sendCorrectionSubmitted = (adminEmail, applicationId, companyName) => {
  const adminUrl = `${FRONTEND}/admin/applications/${applicationId}`;

  console.log(`[Mailer] Notificando a admin ${adminEmail} — corrección recibida de ${companyName}`);

  safeSend({
    from: FROM,
    to:   adminEmail,
    subject: `B2B Platform — Corrección recibida: ${companyName} 🔄`,
    html: `
      <div style="${baseStyle}">
        <div style="${headerStyle('#7c3aed')}">
          <h1 style="color:#fff;margin:0;font-size:22px;">🔄 B2B Platform</h1>
          <p style="color:#ddd6fe;margin:8px 0 0;font-size:14px;">Panel de Administración</p>
        </div>
        <div style="${bodyStyle}">
          <h2 style="margin-top:0;color:#5b21b6;">Corrección de solicitud recibida</h2>
          <p>El proveedor <strong>${companyName}</strong> ha enviado las correcciones solicitadas.
             La solicitud está nuevamente en estado <strong>PENDING</strong> y lista para revisión.</p>

          <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:0 0 8px;color:#5b21b6;font-weight:600;">ID de solicitud:</p>
            <div style="${pillStyle('#7c3aed')}">${applicationId}</div>
          </div>

          <a href="${adminUrl}" style="${btnStyle('#7c3aed')}">
            Revisar solicitud →
          </a>
        </div>
        <div style="${footerStyle}">
          B2B Platform · Notificación automática del sistema
        </div>
      </div>
    `,
  });
};

module.exports = {
  sendSubmissionConfirmation,
  sendActionRequired,
  sendRejection,
  sendApproval,
  sendCorrectionSubmitted,
};
