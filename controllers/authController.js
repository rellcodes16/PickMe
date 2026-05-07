const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const crypto = require('crypto');
const { promisify } = require('util');
const sendEmail = require('../utils/sendEmail');
const AppError = require('../utils/apiError');
const prisma = require('../src/config/prisma');
const { hashPassword } = require('../utils/password');

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

const sanitizeUser = (user) => {
    const {
        password,
        passwordResetToken,
        passwordResetExpires,
        passwordChangedAt,
        inviteToken,
        ...safeUser
    } = user;
    return safeUser;
};

const createSendToken = async (user, statusCode, res) => {
    const token = signToken(user.id);

    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        secure: process.env.NODE_ENV === 'production',
    };

    res.cookie('jwt', token, cookieOptions);

    const memberships = await prisma.organizationMember.findMany({
        where: { userId: user.id },
        include: { organization: true }
    });

    res.status(statusCode).json({
        status: 'success',
        token,
        data: { user: { ...sanitizeUser(user), memberships } },
    });
};

exports.signup = catchAsync(async (req, res, next) => {
    const { name, email, password, organizationName, inviteToken } = req.body;
    const profilePicture = req.file ? req.file.path : undefined;

    let organizationId = null;
    let role = 'voter';
    let finalEmail = email;

    if (inviteToken) {
        let decoded;
        try {
            decoded = jwt.verify(inviteToken, process.env.JWT_SECRET);
        } catch {
            return next(new AppError('Invalid or expired invitation token', 400));
        }

        finalEmail = decoded.email;
        role = decoded.role || 'voter';

        const organization = await prisma.organization.findUnique({
            where: { id: decoded.organizationId }
        });
        if (!organization) return next(new AppError('Invalid or expired invitation token', 400));

        // Email domain validation
        const emailDomain = finalEmail.split('@')[1];
        if (!organization.validEmailDomains.includes(emailDomain)) {
            return next(new AppError('Your email domain is not allowed for this organization', 400));
        }

        organizationId = organization.id;

        const existingUser = await prisma.user.findUnique({ where: { email: finalEmail } });
        if (existingUser) return createSendToken(existingUser, 200, res);
    }

    if (!finalEmail) return next(new AppError('Email is required', 400));

    const existingUser = await prisma.user.findUnique({ where: { email: finalEmail } });
    if (existingUser && !inviteToken) {
        return next(new AppError('User with this email already exists', 400));
    }

    const hashed = await hashPassword(password);

    const newUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: { name, email: finalEmail, password: hashed, profilePicture }
        });

        if (organizationName) {
            const emailDomain = finalEmail.split('@')[1];
            const org = await tx.organization.create({
                data: { name: organizationName, validEmailDomains: [emailDomain] }
            });

            await tx.organizationMember.create({
                data: { userId: user.id, organizationId: org.id, role: 'admin' }
            });
        } else if (organizationId) {
            await tx.organizationMember.create({
                data: { userId: user.id, organizationId, role }
            });
        }

        return user;
    });

    return createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Incorrect email or password' });
    }

    createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) return res.status(401).json({ message: 'You are not logged in!' });

    let decoded;
    try {
        decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    } catch {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const currentUser = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: { memberships: { include: { organization: true } } }
    });

    if (!currentUser) return res.status(401).json({ message: 'User not found' });

    req.user = currentUser;
    next();
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (!user) return res.status(404).json({ message: 'No user with this email' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordResetToken: hashedToken,
            passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000)
        }
    });

    const resetURL = `${req.protocol}://${req.get('host')}/api/auth/resetPassword/${resetToken}`;
    await sendEmail({
        email: user.email,
        subject: 'Password Reset',
        message: `Reset here: ${resetURL}`
    });

    res.status(200).json({ message: 'Token sent to email' });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await prisma.user.findFirst({
        where: {
            passwordResetToken: hashedToken,
            passwordResetExpires: { gt: new Date() }
        }
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
            password: await hashPassword(req.body.password),
            passwordResetToken: null,
            passwordResetExpires: null,
            passwordChangedAt: new Date()
        }
    });

    createSendToken(updated, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!(await bcrypt.compare(req.body.passwordCurrent, user.password))) {
        return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
            password: await hashPassword(req.body.password),
            passwordChangedAt: new Date()
        }
    });

    createSendToken(updated, 200, res);
});

exports.updateCurrentPassword = catchAsync(async (req, res, next) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!(await bcrypt.compare(req.body.passwordCurrent, user.password))) {
        return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
            password: await hashPassword(req.body.password),
            passwordChangedAt: new Date()
        }
    });

    createSendToken(updated, 200, res);
});

exports.updateUser = catchAsync(async (req, res, next) => {
    const { name, email } = req.body;
    const profilePicture = req.file ? req.file.path : undefined;

    const data = {};
    if (name) data.name = name;
    if (profilePicture) data.profilePicture = profilePicture;

    if (email) {
        const emailDomain = email.split('@')[1];

        const memberships = await prisma.organizationMember.findMany({
            where: { userId: req.user.id },
            include: { organization: true }
        });

        const domainAllowed = memberships.some(m =>
            m.organization.validEmailDomains.includes(emailDomain)
        );

        if (memberships.length > 0 && !domainAllowed) {
            return next(new AppError('Your new email domain is not allowed for your organization(s)', 400));
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing && existing.id !== req.user.id) {
            return next(new AppError('Email is already in use', 400));
        }

        data.email = email;
    }

    const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data
    });

    res.status(200).json({
        status: 'success',
        data: { user: sanitizeUser(updatedUser) }
    });
});

exports.isAdmin = catchAsync(async (req, res, next) => {
    const { sessionId } = req.params;

    const session = await prisma.votingSession.findUnique({ where: { id: sessionId } });
    if (!session) return next(new AppError("Voting session not found", 404));

    const member = await prisma.organizationMember.findUnique({
        where: {
            userId_organizationId: {
                userId: req.user.id,
                organizationId: session.organizationId
            }
        }
    });

    if (!member || member.role !== 'admin') {
        return next(new AppError("Access denied. Admins only.", 403));
    }

    next();
});

exports.updateEmailDomains = catchAsync(async (req, res, next) => {
    const { validEmailDomains } = req.body;
    const { id } = req.params;

    if (!Array.isArray(validEmailDomains) || !validEmailDomains.length) {
        return next(new AppError('At least one valid email domain is required', 400));
    }

    const organization = await prisma.organization.findUnique({
        where: { id },
        include: { members: true }
    });
    if (!organization) return next(new AppError('Organization not found', 404));

    const member = organization.members.find(m => m.userId === req.user.id && m.role === 'admin');
    if (!member) return next(new AppError('Only admins can update email domains', 403));

    const existingMembers = await prisma.organizationMember.findMany({
        where: { organizationId: id },
        include: { user: true }
    });

    const invalidMembers = existingMembers.filter(m => {
        const domain = m.user.email.split('@')[1];
        return !validEmailDomains.includes(domain);
    });

    if (invalidMembers.length > 0) {
        return next(new AppError(
            `Cannot restrict domains — ${invalidMembers.length} existing member(s) use domains not in your new list`,
            400
        ));
    }

    const updated = await prisma.organization.update({
        where: { id },
        data: { validEmailDomains }
    });

    res.status(200).json({ status: 'success', data: { organization: updated } });
});