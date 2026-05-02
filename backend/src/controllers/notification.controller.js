const notificationService = require('../services/notification.service');
const prisma = require('../config/prisma');

exports.getUnread = async (req, res, next) => {
  try {
    const notifications = await notificationService.getUnreadNotifications(req.user.id);
    res.json({ ok: true, data: notifications });
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    await notificationService.markAsRead(Number(req.params.id), req.user.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.getSettings = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { notifyMarketplace: true, notifyRFQs: true }
    });
    res.json({ ok: true, data: user });
  } catch (err) {
    next(err);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const { notifyMarketplace, notifyRFQs } = req.body;
    const data = {};
    if (typeof notifyMarketplace === 'boolean') data.notifyMarketplace = notifyMarketplace;
    if (typeof notifyRFQs === 'boolean') data.notifyRFQs = notifyRFQs;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { notifyMarketplace: true, notifyRFQs: true }
    });
    res.json({ ok: true, data: user });
  } catch (err) {
    next(err);
  }
};
