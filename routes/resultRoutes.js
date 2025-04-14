const express = require("express");
const resultController = require("../controllers/resultController");
const { protect } = require("../controllers/authController");

const router = express.Router();

router.use(protect); 

router.get("/", resultController.getAllResults);
router.get("/:sessionId", resultController.getResultsBySession);

module.exports = router;
