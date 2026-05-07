const express = require('express');
const router = express.Router();
const { protect } = require('../controllers/authController');
const {
    subscribe,
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
} = require('../controllers/notificationController');

router.use(protect)

router.get('/subscribe', subscribe)        
router.get('/', getNotifications)
router.patch('/:id/read', markAsRead)
router.patch('/read-all', markAllAsRead)
router.delete('/:id', deleteNotification)

module.exports = router;