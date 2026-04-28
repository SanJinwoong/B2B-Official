/**
 * client-profile.controller.js
 *
 * Handlers para GET y POST /api/clients/profile
 */
const clientProfileService = require('../services/client-profile.service');

/**
 * GET /api/clients/profile
 * Retorna el perfil empresarial del usuario autenticado (o null si no existe).
 */
const getProfile = async (req, res, next) => {
  try {
    const profile = await clientProfileService.getProfile(req.user.id);
    res.status(200).json({ data: profile });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/clients/profile
 * Crea o actualiza el perfil empresarial (upsert).
 * Marca profileCompleted = true en el User al completarlo.
 */
const upsertProfile = async (req, res, next) => {
  try {
    const profile = await clientProfileService.upsertProfile(req.user.id, req.body);
    res.status(200).json({
      message: 'Perfil empresarial guardado correctamente.',
      data: profile,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProfile, upsertProfile };
