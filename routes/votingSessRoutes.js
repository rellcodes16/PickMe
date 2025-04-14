const express = require('express')
const votingSessController = require('../controllers/votingSessController')
const { protect, isAdmin } = require('../controllers/authController')

const router = express.Router()

router.use(protect)

router.post("/create-votingsess/:organizationId", isAdmin, votingSessController.createVotingSession);

router.get("/:organizationId", votingSessController.getVotingSessions);

router.get("/session/:sessionId", votingSessController.getVotingSession);

router.get('/active/:organizationId', protect, votingSessController.getActiveVotingSessions);

router.get('/analytics/:sessionId', protect, votingSessController.getVotingSessionAnalytics);

router.patch("/update-votingsess/:organizationId/:sessionId", isAdmin, votingSessController.updateVotingSession);

router.delete("/delete-votingsess/:organizationId/:sessionId", isAdmin, votingSessController.deleteVotingSession);

router.patch("/sessions/:organizationId/:sessionId/start",isAdmin, votingSessController.startVotingSession);
  
router.patch("/sessions/:organizationId/:sessionId/end",isAdmin, votingSessController.endVotingSession);

router.post("/:organizationId/:sessionId/:id/remind-voters", protect, isAdmin , votingSessController.remindVoters);

  

module.exports = router;