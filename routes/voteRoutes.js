const express = require('express')
const voteController = require('../controllers/voteController')
const { protect } = require('../controllers/authController')

const router = express.Router()

router.use(protect)

router.post('/cast-vote', voteController.castVote);
router.get('/get-votes/:votingSessionId', voteController.getVotes)

module.exports = router;