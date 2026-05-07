// utils/notificationService.js
const prisma = require('../src/config/prisma');

// Stores active SSE connections: userId -> res
const clients = new Map();

// Called from notificationRoutes to open SSE stream
const subscribeToNotifications = (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); 
    res.flushHeaders();

    const userId = req.user.id;
    clients.set(userId, res);

    console.log(`User ${userId} connected to SSE. Total clients: ${clients.size}`);

    // Send a ping immediately so frontend knows connection is alive
    res.write(`event: ping\ndata: connected\n\n`);

    // Keep alive every 30 seconds
    const keepAlive = setInterval(() => {
        res.write(`event: ping\ndata: ping\n\n`);
    }, 30000);

    req.on('close', () => {
        clearInterval(keepAlive);
        clients.delete(userId);
        console.log(`User ${userId} disconnected from SSE. Total clients: ${clients.size}`);
    });
};

// Call this whenever you create a notification to push it live
const pushNotificationToUser = (userId, notification) => {
    const client = clients.get(userId);
    if (client) {
        client.write(`event: notification\ndata: ${JSON.stringify(notification)}\n\n`);
        console.log(`Pushed notification to user ${userId}`);
    }
};

// Creates notification in DB + pushes live if user is connected
const createAndPushNotification = async (userId, message, type, metadata = {}) => {
    const notification = await prisma.notification.create({
        data: { userId, message, type, metadata, isRead: false }
    });

    pushNotificationToUser(userId, notification);
    return notification;
};

// Creates many notifications + pushes to all connected users
const createAndPushManyNotifications = async (notifications) => {
    await prisma.notification.createMany({ data: notifications });

    // Push to any connected users
    notifications.forEach(n => {
        pushNotificationToUser(n.userId, {
            userId: n.userId,
            message: n.message,
            type: n.type,
            metadata: n.metadata || {},
            isRead: false,
            createdAt: new Date()
        });
    });
};

module.exports = {
    subscribeToNotifications,
    pushNotificationToUser,
    createAndPushNotification,
    createAndPushManyNotifications
};