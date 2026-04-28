/**
 * verifyCaptcha.js — MOCK para entorno local/académico
 *
 * ⚠️  Este middleware NO realiza ninguna validación real.
 *     En producción, reemplazar el cuerpo por:
 *
 *       const response = await axios.post(
 *         'https://www.google.com/recaptcha/api/siteverify',
 *         null,
 *         { params: { secret: process.env.RECAPTCHA_SECRET_KEY, response: req.body.captchaToken } }
 *       );
 *       if (!response.data.success || response.data.score < 0.5) {
 *         return res.status(403).json({ error: 'Verificación de seguridad fallida.' });
 *       }
 *       req.captchaScore = response.data.score;
 *       next();
 *
 * En este entorno:
 *   - Inyecta req.captchaScore = 0.9 (valor simulado)
 *   - Llama a next() inmediatamente
 *   - El valor 0.9 se persiste en la BD junto a la solicitud (ilustrativo)
 */
const verifyCaptcha = (req, _res, next) => {
  req.captchaScore = 0.9; // Score simulado — siempre aprueba
  next();
};

module.exports = verifyCaptcha;
