/**
 * @swagger
 * tags:
 *   name: Votes
 *   description: Voting operations (casting and retrieving votes)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Vote:
 *       type: object
 *       required:
 *         - user
 *         - votingSession
 *         - candidate
 *         - position
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated ID of the vote
 *         user:
 *           type: string
 *           description: ID of the user who cast the vote
 *         votingSession:
 *           type: string
 *           description: ID of the voting session this vote belongs to
 *         candidate:
 *           type: string
 *           description: ID of the candidate being voted for
 *         position:
 *           type: string
 *           description: The position contested (e.g., President, Treasurer)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the vote was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the vote was last updated
 *       example:
 *         id: 650f2a2c5f3e1c9b9d8e1234
 *         user: 650e8ac25f3e1c9b9d8e5678
 *         votingSession: 650e9bd15f3e1c9b9d8e9012
 *         candidate: 650e9d4a5f3e1c9b9d8e3456
 *         position: "President"
 *         createdAt: "2025-09-16T10:15:30.000Z"
 *         updatedAt: "2025-09-16T10:15:30.000Z"
 */

/**
 * @swagger
 * /votes/cast-vote:
 *   post:
 *     summary: Cast a vote
 *     tags: [Votes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - votingSession
 *               - candidate
 *               - position
 *             properties:
 *               votingSession:
 *                 type: string
 *                 description: The ID of the voting session
 *               candidate:
 *                 type: string
 *                 description: The ID of the candidate being voted for
 *               position:
 *                 type: string
 *                 description: The position contested
 *             example:
 *               votingSession: 650e9bd15f3e1c9b9d8e9012
 *               candidate: 650e9d4a5f3e1c9b9d8e3456
 *               position: "President"
 *     responses:
 *       201:
 *         description: Vote successfully cast
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vote'
 *       400:
 *         description: Invalid input or duplicate vote
 */

/**
 * @swagger
 * /votes/get-votes/{votingSessionId}:
 *   get:
 *     summary: Get all votes for a specific voting session
 *     tags: [Votes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: votingSessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the voting session
 *     responses:
 *       200:
 *         description: List of votes for the voting session
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Vote'
 *       404:
 *         description: Voting session not found or no votes recorded
 */
