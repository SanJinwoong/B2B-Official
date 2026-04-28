/**
 * client-profile.service.js
 *
 * Lógica de negocio para el perfil empresarial del cliente (Fase 2).
 */
const prisma = require('../config/prisma');

const bizError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

/**
 * Obtiene el perfil empresarial del cliente autenticado.
 * Retorna null si aún no existe (el cliente no ha completado la Fase 2).
 */
const getProfile = async (userId) => {
  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
  });
  return profile; // puede ser null
};

/**
 * Crea o actualiza el perfil empresarial del cliente (upsert).
 * Al completarlo, activa profileCompleted = true en User.
 *
 * @param {number} userId  - ID del usuario autenticado
 * @param {object} data    - Campos validados del schema
 */
const upsertProfile = async (userId, data) => {
  // Verificar que el usuario existe y es CLIENT
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user) throw bizError('Usuario no encontrado.', 404);
  if (user.role !== 'CLIENT') {
    throw bizError('Solo los clientes pueden gestionar un perfil empresarial.', 403);
  }

  const { companyName, taxId, businessType, commercialAddress, shippingAddress, website } = data;

  // Normalizar campos opcionales
  const cleanWebsite        = website?.trim()         || null;
  const cleanShipping       = shippingAddress?.trim() || null;

  // Upsert del perfil
  const profile = await prisma.clientProfile.upsert({
    where:  { userId },
    create: {
      userId,
      companyName,
      taxId,
      businessType,
      commercialAddress,
      shippingAddress: cleanShipping,
      website:         cleanWebsite,
    },
    update: {
      companyName,
      taxId,
      businessType,
      commercialAddress,
      shippingAddress: cleanShipping,
      website:         cleanWebsite,
    },
  });

  // Marcar el perfil como completado en el User
  await prisma.user.update({
    where: { id: userId },
    data:  { profileCompleted: true },
  });

  return profile;
};

module.exports = { getProfile, upsertProfile };
