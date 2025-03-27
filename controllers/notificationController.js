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
