const express = require('express')
const invitationController = require('../controllers/invitationController')
const { protect } = require('../controllers/authController')

const router = express.Router()

router.use(protect)

router.post("/invite-admin", protect, invitationController.inviteAdmin);
router.post("/invite-voter", protect, invitationController.inviteVoter);

module.exports = router;