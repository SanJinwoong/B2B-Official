const dashboardService = require('../services/dashboard.service');

const getClientDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getClientDashboard(req.user.id);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

module.exports = { getClientDashboard };
