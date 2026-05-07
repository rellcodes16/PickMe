const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/apiError");
const prisma = require('../src/config/prisma');
const { subscribeToNotifications } = require('../utils/notificationService');

exports.subscribe = subscribeToNotifications;

exports.getNotifications = catchAsync(async (req, res, next) => {
    const notifications = await prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
        status: "success",
        results: notifications.length,
        data: notifications
    });
});

exports.markAsRead = catchAsync(async (req, res, next) => {
    const notification = await prisma.notification.findFirst({
        where: { id: req.params.id, userId: req.user.id }
    });

    if (!notification) return next(new AppError("Notification not found", 404));

    const updated = await prisma.notification.update({
        where: { id: req.params.id },
        data: { isRead: true }
    });

    res.status(200).json({ status: "success", data: updated });
});

exports.markAllAsRead = catchAsync(async (req, res, next) => {
    await prisma.notification.updateMany({
        where: { userId: req.user.id, isRead: false },
        data: { isRead: true }
    });

    res.status(200).json({ status: "success", message: "All notifications marked as read" });
});

exports.deleteNotification = catchAsync(async (req, res, next) => {
    const notification = await prisma.notification.findFirst({
        where: { id: req.params.id, userId: req.user.id }
    });

    if (!notification) return next(new AppError("Notification not found", 404));

    await prisma.notification.delete({ where: { id: req.params.id } });

    res.status(204).json({ status: "success", data: null });
});