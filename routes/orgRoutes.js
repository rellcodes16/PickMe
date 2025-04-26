const express = require('express')
const orgController = require('../controllers/orgController')
const { protect, isAdmin } = require('../controllers/authController')
const uploadMiddleware = require('../utils/multer')

const router = express.Router()

router.use(protect)

router.post('/create', uploadMiddleware, orgController.createOrganization);
router.post('/leave-org', orgController.leaveOrganization)
router.get('/my-organizations', orgController.getUserOrganizations);
router.patch('/assign-admin', orgController.assignAdmin)
router.patch('/update-org/:organizationId', uploadMiddleware, orgController.updateOrganization);
router.delete('/remove-member', orgController.removeMember)
router.delete('/remove-admin', orgController.removeAdmin)
router.delete('/delete-org', orgController.deleteOrganization)

module.exports = router;