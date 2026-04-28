/**
 * mailer.service.js — MOCK para entorno local/académico
 *
 * ⚠️  NO establece ninguna conexión SMTP real.
 *     En producción reemplazar los console.log por llamadas a Nodemailer/Resend.
 *
 * REGLA ESTRICTA: cualquier actionToken, URL de corrección o contraseña temporal
 * se imprime siempre de forma visible en la terminal para poder probar la
 * máquina de estados sin acceso a un buzón real.
 */

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ── Helper visual ──────────────────────────────────────────────────────────────
const box = (lines) => {
  const width  = Math.max(...lines.map((l) => l.length)) + 4;
  const border = '═'.repeat(width);
  console.log(`\n╔${border}╗`);
  lines.forEach((line) => {
    const pad = ' '.repeat(width - line.length);
    console.log(`║  ${line}${pad}║`);
  });
  console.log(`╚${border}╝\n`);
};

// ── 1. Confirmación de recepción ───────────────────────────────────────────────
/**
 * Se envía al prospecto justo después de que el registro fue recibido.
 *
 * @param {string} email         - Correo del prospecto
 * @param {string} applicationId - ID de la solicitud creada
 */
const sendSubmissionConfirmation = (email, applicationId) => {
  box([
    '📧  MOCK CORREO — TERMINAL DEL SERVIDOR',
    '─'.repeat(50),
    `Para    : ${email}`,
    `Asunto  : Registro B2B recibido — Solicitud en revisión`,
    '─'.repeat(50),
    `Tu solicitud fue recibida exitosamente.`,
    `ID de seguimiento : ${applicationId}`,
    `Estado actual     : PENDING`,
    `Tiempo estimado   : 2-5 días hábiles`,
    '─'.repeat(50),
    `🔗 Consulta tu estado: ${FRONTEND_URL}/registro-proveedor/estado/${applicationId}`,
  ]);
};

// ── 2. Acción requerida (corrección parcial) ───────────────────────────────────
/**
 * Se envía cuando el admin detecta un problema y requiere corrección.
 * El actionToken se imprime en grande para que pueda copiarse desde la terminal.
 *
 * @param {string} email         - Correo del prospecto
 * @param {string} applicationId - ID de la solicitud
 * @param {string} actionNote    - Motivo documentado por el admin
 * @param {string} actionToken   - Token único de corrección (72 h de vigencia)
 */
const sendActionRequired = (email, applicationId, actionNote, actionToken) => {
  const correctionUrl = `${FRONTEND_URL}/registro-proveedor/corregir?token=${actionToken}`;

  box([
    '📧  MOCK CORREO — TERMINAL DEL SERVIDOR',
    '─'.repeat(60),
    `Para    : ${email}`,
    `Asunto  : ⚠️  Acción requerida en tu registro B2B`,
    '─'.repeat(60),
    `Motivo  : ${actionNote}`,
    '─'.repeat(60),
    `⏱️  Este enlace expira en 72 horas y es de un solo uso.`,
    '─'.repeat(60),
    `🔑  TOKEN (copia para pruebas):`,
    `    ${actionToken}`,
    '─'.repeat(60),
    `🔗  URL DE CORRECCIÓN (copia para pruebas):`,
    `    ${correctionUrl}`,
  ]);
};

// ── 3. Rechazo definitivo ──────────────────────────────────────────────────────
/**
 * Se envía cuando el admin rechaza definitivamente la solicitud.
 *
 * @param {string} email      - Correo del prospecto
 * @param {string} actionNote - Motivo del rechazo
 */
const sendRejection = (email, actionNote) => {
  box([
    '📧  MOCK CORREO — TERMINAL DEL SERVIDOR',
    '─'.repeat(50),
    `Para    : ${email}`,
    `Asunto  : Tu solicitud de registro B2B fue rechazada`,
    '─'.repeat(50),
    `Motivo  : ${actionNote}`,
    '─'.repeat(50),
    `Si consideras que es un error, contacta a:`,
    `proveedores@b2bplatform.com`,
  ]);
};

// ── 4. Aprobación + credenciales temporales ────────────────────────────────────
/**
 * Se envía cuando el admin aprueba la solicitud y se crea el User SUPPLIER.
 * La contraseña temporal se imprime en grande para poder iniciar sesión.
 *
 * @param {string} email        - Correo del nuevo proveedor
 * @param {string} tempPassword - Contraseña temporal generada (texto plano, previa al hash)
 */
const sendApproval = (email, tempPassword) => {
  box([
    '📧  MOCK CORREO — TERMINAL DEL SERVIDOR',
    '─'.repeat(60),
    `Para    : ${email}`,
    `Asunto  : 🎉 ¡Tu cuenta de proveedor B2B fue aprobada!`,
    '─'.repeat(60),
    `Ya puedes iniciar sesión con las siguientes credenciales:`,
    ``,
    `  Usuario : ${email}`,
    `  🔑  CONTRASEÑA TEMPORAL (copia para pruebas):`,
    `      ${tempPassword}`,
    ``,
    `⚠️  Cambia tu contraseña al primer inicio de sesión.`,
    '─'.repeat(60),
    `🔗  Login: ${FRONTEND_URL}/login`,
  ]);
};

module.exports = {
  sendSubmissionConfirmation,
  sendActionRequired,
  sendRejection,
  sendApproval,
};
