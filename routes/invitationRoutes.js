const express = require('express')
const invitationController = require('../controllers/invitationController')
const { protect } = require('../controllers/authController')

const router = express.Router()

router.use(protect)

router.post("/invite-admin", protect, invitationController.inviteAdmin);
router.post("/invite-voter", protect, invitationController.inviteVoter);
router.post("/accept-invite", protect, invitationController.acceptInvite);
router.post("/decline-invite", protect, invitationController.declineInvite);
router.get("/get-pending-invites", protect, invitationController.getPendingInvites);

module.exports = router;