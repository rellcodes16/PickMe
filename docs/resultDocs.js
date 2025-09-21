/**
 * @swagger
 * components:
 *   schemas:
 *     Result:
 *       type: object
 *       required:
 *         - votingSession
 *         - results
 *         - winners
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated ID for the result
 *         votingSession:
 *           type: string
 *           description: Reference to the voting session this result belongs to
 *         results:
 *           type: object
 *           description: Object containing votes breakdown per candidate/position
 *         winners:
 *           type: object
 *           description: Object containing the winners of the voting session
 *         generatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the results were generated
 */

/**
 * @swagger
 * tags:
 *   name: Results
 *   description: Endpoints for retrieving election/voting results
 */

/**
 * @swagger
 * /results:
 *   get:
 *     summary: Get all results
 *     tags: [Results]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all results
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Result'
 *
 * /results/{sessionId}:
 *   get:
 *     summary: Get results for a specific voting session
 *     tags: [Results]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the voting session
 *     responses:
 *       200:
 *         description: Results for the given session
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Result'
 *       404:
 *         description: No results found for this session
 */
