const express = require('express')
const orgController = require('../controllers/orgController')
const { protect } = require('../controllers/authController')
const uploadMiddleware = require('../utils/multer')

const router = express.Router()

router.use(protect)

router.post('/create', uploadMiddleware, orgController.createOrganization);
router.get('/my-organizations', orgController.getUserOrganizations);
router.patch('/assign-admin', orgController.assignAdmin)
router.patch('/update-org/:organizationId', uploadMiddleware, orgController.updateOrganization);
router.delete('/remove-user', orgController.removeUser)

module.exports = router;