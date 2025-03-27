const express = require('express')
const authController = require('../controllers/authController')
const uploadMiddleware = require('../utils/multer')

const router = express.Router()

router.post('/signup', uploadMiddleware, authController.signup);
router.post('/login', authController.login);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword', authController.resetPassword);
router.patch('/updateMe', authController.protect, uploadMiddleware , authController.updateUser);

module.exports = router;