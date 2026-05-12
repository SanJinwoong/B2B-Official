const prisma = require('../config/prisma');

/**
 * Obtiene la configuración global de la plataforma.
 * Si no existe aún, la crea con valores predeterminados.
 */
const getConfig = async () => {
  let config = await prisma.platformConfig.findFirst();
  if (!config) {
    config = await prisma.platformConfig.create({
      data: { marginPercentage: 15, currency: 'MXN', companyName: 'B2B Intermediacion' },
    });
  }
  return config;
};

/**
 * Actualiza la configuración global.
 */
const updateConfig = async ({ marginPercentage, currency, companyName }) => {
  let config = await prisma.platformConfig.findFirst();
  if (!config) {
    return prisma.platformConfig.create({
      data: { marginPercentage, currency, companyName },
    });
  }
  return prisma.platformConfig.update({
    where: { id: config.id },
    data: {
      ...(marginPercentage !== undefined && { marginPercentage: parseFloat(marginPercentage) }),
      ...(currency !== undefined && { currency }),
      ...(companyName !== undefined && { companyName }),
    },
  });
};

/**
 * Helper: devuelve solo el porcentaje de margen actual.
 * Usado internamente por otros servicios.
 */
const getMargin = async () => {
  const config = await getConfig();
  return config.marginPercentage;
};

/**
 * Aplica el margen a un precio dado.
 * precio_cliente = precio_proveedor × (1 + margen/100)
 */
const applyMargin = (supplierPrice, marginPercentage) => {
  return parseFloat((supplierPrice * (1 + marginPercentage / 100)).toFixed(2));
};

module.exports = { getConfig, updateConfig, getMargin, applyMargin };
