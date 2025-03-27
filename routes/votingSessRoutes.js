const express = require('express')
const votingSessController = require('../controllers/votingSessController')
const { protect, isAdmin } = require('../controllers/authController')

const router = express.Router()

router.use(protect)

router.post("/:organizationId", isAdmin, votingSessController.createVotingSession);

router.get("/:organizationId", votingSessController.getVotingSessions);

router.get("/session/:sessionId", votingSessController.getVotingSession);

router.patch("/:organizationId/:sessionId", isAdmin, votingSessController.updateVotingSession);

router.delete("/:organizationId/:sessionId", isAdmin, votingSessController.deleteVotingSession);

router.patch("/:organizationId/sessions/:sessionId/start", isAdmin, votingSessController.startVotingSession);
  
router.patch("/:organizationId/sessions/:sessionId/end", isAdmin, votingSessController.endVotingSession);
  

module.exports = router;