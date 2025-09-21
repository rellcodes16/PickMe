/**
 * @swagger
 * components:
 *   schemas:
 *     Candidate:
 *       type: object
 *       required:
 *         - userId
 *         - position
 *         - votingSessionId
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated ID of the candidate
 *         userId:
 *           type: string
 *           description: Reference to the User running as candidate
 *         position:
 *           type: string
 *           description: Position the candidate is running for
 *         votingSessionId:
 *           type: string
 *           description: The voting session this candidate belongs to
 *         votes:
 *           type: number
 *           default: 0
 *           description: Count of votes received by the candidate
 */

/**
 * @swagger
 * tags:
 *   name: Candidates
 *   description: Candidate management in voting sessions
 */

/**
 * @swagger
 * /candidates/create:
 *   post:
 *     summary: Create a new candidate for a voting session
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The user ID of the candidate
 *               position:
 *                 type: string
 *               votingSessionId:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Candidate successfully created
 *       400:
 *         description: Invalid input
 *
 * /candidates/{votingSessionId}:
 *   get:
 *     summary: Get all candidates for a voting session
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: votingSessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of candidates in the voting session
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Candidate'
 *
 * /candidates/update/{candidateId}:
 *   patch:
 *     summary: Update a candidate
 *     tags: [Candidates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: candidateId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               position:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Candidate updated successfully
 *       404:
 *         description: Candidate not found
 */
