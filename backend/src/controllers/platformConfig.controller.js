const { getConfig, updateConfig } = require('../services/platformConfig.service');

const getAdminConfig = async (req, res, next) => {
  try {
    const config = await getConfig();
    res.json(config);
  } catch (e) { next(e); }
};

const patchAdminConfig = async (req, res, next) => {
  try {
    const { marginPercentage, currency, companyName } = req.body;
    const config = await updateConfig({ marginPercentage, currency, companyName });
    res.json(config);
  } catch (e) { next(e); }
};

module.exports = { getAdminConfig, patchAdminConfig };
