const express = require('express')
const orgController = require('../controllers/orgController')
const { protect } = require('../controllers/authController')

const router = express.Router()

router.use(protect)

router.post('/create', orgController.createOrganization);
router.get('/my-organizations', orgController.getUserOrganizations);
router.patch('/assign-admin', orgController.assignAdmin)
router.delete('/remove-user', orgController.removeUser)

module.exports = router;