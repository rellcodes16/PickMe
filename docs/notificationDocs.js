/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       required:
 *         - user
 *         - message
 *         - type
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated ID of the notification
 *         user:
 *           type: string
 *           description: Reference to the user receiving the notification
 *         message:
 *           type: string
 *           description: Notification message content
 *         type:
 *           type: string
 *           enum: [voting_result, voting_start, general]
 *           description: Type of notification
 *         isRead:
 *           type: boolean
 *           default: false
 *           description: Whether the notification has been read
 *         metadata:
 *           type: object
 *           description: Additional data (like sessionId, candidateId, etc.)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the notification was created
 */

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Endpoints for user notifications
 */

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get all notifications for the logged-in user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notification'
 *
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 */
