/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Authentication and user management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated ID of the user
 *         name:
 *           type: string
 *           description: Full name of the user
 *         email:
 *           type: string
 *           description: Email address of the user
 *         profilePicture:
 *           type: string
 *           description: Profile picture URL
 *         password:
 *           type: string
 *           description: User password (hashed)
 *         organizationIds:
 *           type: array
 *           items:
 *             type: string
 *           description: List of organizations the user belongs to
 *         pendingInvites:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               organizationId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, voter]
 *               token:
 *                 type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         id: 650fa9d45f3e1c9b9d8e2468
 *         name: "John Doe"
 *         email: "john@example.com"
 *         profilePicture: "https://example.com/uploads/profile.jpg"
 *         organizationIds: ["650ff9b15f3e1c9b9d8e9876"]
 *         pendingInvites:
 *           - organizationId: "650ff9b15f3e1c9b9d8e9876"
 *             role: "voter"
 *             token: "invite-token-123"
 */

/**
 * @swagger
 * /users/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - passwordConfirm
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               passwordConfirm:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *             example:
 *               email: john@example.com
 *               password: secret123
 *     responses:
 *       200:
 *         description: User logged in successfully (JWT returned)
 */

/**
 * @swagger
 * /users/forgotPassword:
 *   post:
 *     summary: Request password reset
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *             example:
 *               email: john@example.com
 *     responses:
 *       200:
 *         description: Password reset email sent
 */

/**
 * @swagger
 * /users/resetPassword/{token}:
 *   patch:
 *     summary: Reset password with token
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - passwordConfirm
 *             properties:
 *               password:
 *                 type: string
 *               passwordConfirm:
 *                 type: string
 *             example:
 *               password: "newPassword123"
 *               passwordConfirm: "newPassword123"
 *     responses:
 *       200:
 *         description: Password reset successful
 */

/**
 * @swagger
 * /users/updatePassword:
 *   patch:
 *     summary: Update current user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - newPasswordConfirm
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               newPasswordConfirm:
 *                 type: string
 *             example:
 *               currentPassword: "oldPassword123"
 *               newPassword: "newPassword123"
 *               newPasswordConfirm: "newPassword123"
 *     responses:
 *       200:
 *         description: Password updated successfully
 */

/**
 * @swagger
 * /users/updateMe:
 *   patch:
 *     summary: Update current user profile
 *     tags: [Users]
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
 *               email:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
