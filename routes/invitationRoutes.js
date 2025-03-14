const express = require('express')
const invitationController = require('../controllers/invitationController')
const { protect } = require('../controllers/authController')

const router = express.Router()

router.use(protect)

router.post('/invite-users', invitationController.inviteUser);

module.exports = router;