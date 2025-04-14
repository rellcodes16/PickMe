const express = require('express')
const notificationController = require('../controllers/notificationController')
const { protect } = require('../controllers/authController')

const router = express.Router()

router.use(protect)

router.get('/', notificationController.getNotifications);
router.patch("/:id/read", notificationController.markAsRead);

module.exports = router;