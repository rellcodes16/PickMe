/**
 * @swagger
 * tags:
 *   name: VotingSessions
 *   description: Manage voting sessions for organizations
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     VotingSession:
 *       type: object
 *       required:
 *         - title
 *         - organization
 *         - createdBy
 *         - startDate
 *         - endDate
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated ID of the voting session
 *         title:
 *           type: string
 *           description: The title of the voting session
 *         organization:
 *           type: string
 *           description: ID of the organization this session belongs to
 *         createdBy:
 *           type: string
 *           description: ID of the user who created the session
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: When the session starts
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: When the session ends
 *         votes:
 *           type: array
 *           items:
 *             type: string
 *           description: List of vote IDs
 *         candidates:
 *           type: array
 *           items:
 *             type: string
 *           description: List of candidate IDs
 *         voters:
 *           type: array
 *           items:
 *             type: string
 *           description: List of user IDs eligible to vote
 *         status:
 *           type: string
 *           enum: [pending, active, closed]
 *           description: Current status of the session
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         id: 6510c9f25f3e1c9b9d8e1234
 *         title: "2025 Student Union Elections"
 *         organization: 650ff9b15f3e1c9b9d8e9876
 *         createdBy: 650fe8a25f3e1c9b9d8e5432
 *         startDate: "2025-09-20T09:00:00Z"
 *         endDate: "2025-09-22T17:00:00Z"
 *         candidates: [ "650fa9d45f3e1c9b9d8e2468" ]
 *         voters: [ "650f8ac25f3e1c9b9d8e6789" ]
 *         status: "pending"
 */

/**
 * @swagger
 * /voting-sessions/create-votingsess/{organizationId}:
 *   post:
 *     summary: Create a new voting session
 *     tags: [VotingSessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID the session belongs to
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - startDate
 *               - endDate
 *             properties:
 *               title:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *             example:
 *               title: "Presidential Elections"
 *               startDate: "2025-09-25T09:00:00Z"
 *               endDate: "2025-09-27T17:00:00Z"
 *     responses:
 *       201:
 *         description: Voting session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VotingSession'
 */

/**
 * @swagger
 * /voting-sessions/all:
 *   get:
 *     summary: Get all voting sessions for the authenticated user
 *     tags: [VotingSessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of voting sessions
 */

/**
 * @swagger
 * /voting-sessions/{organizationId}:
 *   get:
 *     summary: Get all sessions for a specific organization
 *     tags: [VotingSessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of sessions for the organization
 */

/**
 * @swagger
 * /voting-sessions/session/{sessionId}:
 *   get:
 *     summary: Get details of a specific voting session
 *     tags: [VotingSessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Voting session details
 */

/**
 * @swagger
 * /voting-sessions/active/{organizationId}:
 *   get:
 *     summary: Get active sessions for an organization
 *     tags: [VotingSessions]
 *     security:
 *       - bearerAuth: []
 */

/**
 * @swagger
 * /voting-sessions/analytics/{sessionId}:
 *   get:
 *     summary: Get voting analytics for a session
 *     tags: [VotingSessions]
 *     security:
 *       - bearerAuth: []
 */

/**
 * @swagger
 * /voting-sessions/update-votingsess/{organizationId}/{sessionId}:
 *   patch:
 *     summary: Update a voting session (Admin only)
 *     tags: [VotingSessions]
 *     security:
 *       - bearerAuth: []
 */

/**
 * @swagger
 * /voting-sessions/delete-votingsess/{organizationId}/{sessionId}:
 *   delete:
 *     summary: Delete a voting session (Admin only)
 *     tags: [VotingSessions]
 *     security:
 *       - bearerAuth: []
 */

/**
 * @swagger
 * /voting-sessions/sessions/{organizationId}/{sessionId}/start:
 *   patch:
 *     summary: Start a voting session
 *     tags: [VotingSessions]
 *     security:
 *       - bearerAuth: []
 */

/**
 * @swagger
 * /voting-sessions/sessions/{organizationId}/{sessionId}/end:
 *   patch:
 *     summary: End a voting session
 *     tags: [VotingSessions]
 *     security:
 *       - bearerAuth: []
 */

/**
 * @swagger
 * /voting-sessions/{organizationId}/{sessionId}/{id}/remind-voters:
 *   post:
 *     summary: Send reminders to voters for a session
 *     tags: [VotingSessions]
 *     security:
 *       - bearerAuth: []
 */
