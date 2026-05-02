const prisma = require('../config/prisma');

/**
 * Creates a new notification for a user, respecting their notification settings.
 * @param {number} userId - The ID of the user to notify
 * @param {string} type - Notification type (e.g., 'MARKETPLACE_ORDER', 'ORDER_SHIPPED', 'RFQ_NEW')
 * @param {string} title - The notification title
 * @param {string} message - The notification message
 * @param {string} [link] - Optional link to navigate to
 */
const notifyUser = async (userId, type, title, message, link = null) => {
  // First, fetch the user to check their settings
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notifyMarketplace: true, notifyRFQs: true }
  });

  if (!user) return null;

  // Check if notification is silenced
  if (type === 'MARKETPLACE_ORDER' && !user.notifyMarketplace) return null;
  if (type === 'RFQ_NEW' && !user.notifyRFQs) return null;

  // For clients (ORDER_SHIPPED), we assume they always want delivery notifications for now,
  // unless we add specific client settings later.

  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      link,
    }
  });
};

/**
 * Gets the unread notifications for a user.
 */
const getUnreadNotifications = async (userId) => {
  return prisma.notification.findMany({
    where: { userId, isRead: false },
    orderBy: { createdAt: 'desc' }
  });
};

/**
 * Marks a notification as read.
 */
const markAsRead = async (notificationId, userId) => {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true }
  });
};

/**
 * Marks all notifications as read for a user.
 */
const markAllAsRead = async (userId) => {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true }
  });
};

module.exports = {
  notifyUser,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,
};
