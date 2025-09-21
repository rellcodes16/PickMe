/**
 * @swagger
 * components:
 *   schemas:
 *     Invitation:
 *       type: object
 *       required:
 *         - email
 *         - organizationId
 *         - token
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated ID of the invitation
 *         email:
 *           type: string
 *           description: Email of the invited user
 *         organizationId:
 *           type: string
 *           description: The organization this invitation is linked to
 *         token:
 *           type: string
 *           description: Unique token for invitation validation
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: Expiration date of the invitation
 *       example:
 *         id: 64af23c9123e8f4b8b9d7eab
 *         email: user@example.com
 *         organizationId: 64af21c9123e8f4b8b9d7eaa
 *         token: abc123xyz
 *         expiresAt: 2025-09-23T10:00:00.000Z
 */

/**
 * @swagger
 * tags:
 *   name: Invitations
 *   description: Manage organization invitations
 */

/**
 * @swagger
 * /invitations/invite-admin:
 *   post:
 *     summary: Invite a user as an admin
 *     tags: [Invitations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               organizationId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Invitation sent successfully
 *       400:
 *         description: Invalid request
 *
 * /invitations/invite-voter:
 *   post:
 *     summary: Invite a user as a voter
 *     tags: [Invitations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               organizationId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Invitation sent successfully
 *
 * /invitations/accept-invite:
 *   post:
 *     summary: Accept an invitation
 *     tags: [Invitations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invitation accepted successfully
 *
 * /invitations/decline-invite:
 *   post:
 *     summary: Decline an invitation
 *     tags: [Invitations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invitation declined successfully
 *
 * /invitations/get-pending-invites:
 *   get:
 *     summary: Get all pending invites for the current user
 *     tags: [Invitations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending invitations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Invitation'
 */
