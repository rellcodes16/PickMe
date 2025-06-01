const express = require('express')
const authController = require('../controllers/authController')
const uploadMiddleware = require('../utils/multer')

console.log(authController)

const router = express.Router()

router.post('/signup', uploadMiddleware, authController.signup);
router.post('/login', authController.login);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword', authController.resetPassword);
router.patch('/updatePassword', authController.protect, authController.updatePassword);
router.patch('/updateMe', authController.protect, uploadMiddleware , authController.updateUser);

module.exports = router;