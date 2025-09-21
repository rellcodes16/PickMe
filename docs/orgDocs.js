/**
 * @swagger
 * components:
 *   schemas:
 *     Organization:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated unique ID for the organization
 *         name:
 *           type: string
 *           description: Name of the organization
 *         description:
 *           type: string
 *           description: Brief description of the organization
 *         profilePicture:
 *           type: string
 *           description: URL of the organization’s profile picture
 *         roles:
 *           type: array
 *           description: Roles assigned to users within the organization
 *           items:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user with a role
 *               role:
 *                 type: string
 *                 enum: [admin, voter]
 *                 default: voter
 *         members:
 *           type: array
 *           description: List of members in the organization
 *           items:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Member user ID
 *               name:
 *                 type: string
 *                 description: Member name
 *               profilePicture:
 *                 type: string
 *                 description: Member profile picture
 *         validEmailDomains:
 *           type: array
 *           description: List of valid email domains allowed to join
 *           items:
 *             type: string
 */

/**
 * @swagger
 * tags:
 *   name: Organization
 *   description: Endpoints for managing organizations
 */

/**
 * @swagger
 * /organization/create:
 *   post:
 *     summary: Create a new organization
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Organization created successfully
 *       400:
 *         description: Validation error
 *
 * /organization/my-organizations:
 *   get:
 *     summary: Get all organizations the user belongs to
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user organizations
 *
 * /organization/leave-org:
 *   post:
 *     summary: Leave an organization
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               organizationId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully left organization
 *
 * /organization/assign-admin:
 *   patch:
 *     summary: Assign admin role to a user
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               organizationId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin role assigned successfully
 *
 * /organization/update-org/{organizationId}:
 *   patch:
 *     summary: Update organization details
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Organization updated successfully
 *
 * /organization/remove-member:
 *   delete:
 *     summary: Remove a member from an organization
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               organizationId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Member removed successfully
 *
 * /organization/remove-admin:
 *   delete:
 *     summary: Remove an admin role from a user
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               organizationId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin removed successfully
 *
 * /organization/delete-org:
 *   delete:
 *     summary: Delete an organization
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               organizationId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Organization deleted successfully
 */
