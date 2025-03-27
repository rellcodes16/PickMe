const express = require("express");
const candidateController = require("../controllers/candidateController");
const { protect } = require("../controllers/authController");
const uploadMiddleware = require("../utils/multer"); 

const router = express.Router();

router.post("/create", protect, uploadMiddleware, candidateController.createCandidate);
router.get("/:votingSessionId", protect, candidateController.getCandidates);
router.patch("/update/:candidateId", protect, uploadMiddleware, candidateController.updateCandidate); 

module.exports = router;
