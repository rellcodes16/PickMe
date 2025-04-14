const Notification = require("../models/Notification");
const catchAsync = require("../utils/catchAsync");

exports.getNotifications = catchAsync(async (req, res, next) => {
    console.log("🔍 Fetching notifications for user:", req.user.id);
    const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
    console.log("📬 Notifications found:", notifications);

    res.status(200).json({
        status: "success",
        data: notifications
    });
});

exports.markAsRead = catchAsync(async (req, res, next) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, user: req.user.id },
        { isRead: true },
        { new: true }
    );

    if (!notification) return next(new AppError("Notification not found", 404));

    res.status(200).json({
        status: "success",
        data: notification
    });
});

