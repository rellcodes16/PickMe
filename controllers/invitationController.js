const csv = require('csv-parser');
const multer = require('multer');
const fs = require('fs');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/apiError');
const sendEmail = require('../utils/sendEmail');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../src/config/prisma');

const upload = multer({ dest: 'uploads/' });

const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

const validateEmailDomain = (email, organization) => {
    const emailDomain = email.split('@')[1];
    return organization.validEmailDomains.includes(emailDomain);
};

exports.inviteAdmin = catchAsync(async (req, res, next) => {
    const { email, organizationId } = req.body;

    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: { members: { orderBy: { createdAt: 'asc' } } }
    });
    if (!organization) return next(new AppError('Organization not found', 404));

    const creator = organization.members[0];
    if (creator.userId !== req.user.id) {
        return next(new AppError('Only the organization creator can invite admins', 403));
    }

    if (!validateEmailDomain(email, organization)) {
        return next(new AppError('This email domain is not allowed for this organization', 400));
    }

    const inviteToken = jwt.sign({
        email,
        organizationId,
        organizationName: organization.name,
        role: 'admin'
    }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const inviteLink = `${req.protocol}://${req.get('host')}/signup?inviteToken=${inviteToken}`;
    const hashedToken = hashToken(inviteToken);

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
        await prisma.pendingInvite.create({
            data: {
                userId: user.id,
                organizationId,
                role: 'admin',
                token: hashedToken
            }
        });
    } else {
        await sendEmail({
            email,
            subject: 'Admin Invitation',
            message: `You have been invited to be an admin of ${organization.name}. Click the link to accept: ${inviteLink}`,
        });
    }

    res.status(200).json({
        status: 'success',
        message: 'Admin invitation sent successfully',
        inviteLink,
    });
});

exports.inviteVoter = [
    upload.single('csvFile'),

    catchAsync(async (req, res, next) => {
        const { email, organizationId } = req.body;

        const organization = await prisma.organization.findUnique({
            where: { id: organizationId },
            include: { members: true }
        });
        if (!organization) return next(new AppError('Organization not found', 404));

        const isAdmin = organization.members.some(
            m => m.userId === req.user.id && m.role === 'admin'
        );
        if (!isAdmin) return next(new AppError('Only admins can invite voters', 403));

        const processEmail = async (emailToProcess) => {
            if (!validateEmailDomain(emailToProcess, organization)) {
                console.log(`Skipping ${emailToProcess} — domain not allowed`);
                return { skipped: true, email: emailToProcess };
            }

            const user = await prisma.user.findUnique({ where: { email: emailToProcess } });

            if (user) {
                const isUserInOrg = organization.members.some(m => m.userId === user.id);
                if (!isUserInOrg) {
                    await prisma.organizationMember.create({
                        data: { userId: user.id, organizationId, role: 'voter' }
                    });
                }
            } else {
                const inviteToken = jwt.sign({
                    email: emailToProcess,
                    organizationId,
                    organizationName: organization.name,
                    role: 'voter'
                }, process.env.JWT_SECRET, { expiresIn: '7d' });

                const inviteLink = `${req.protocol}://${req.get('host')}/signup?inviteToken=${inviteToken}`;

                await sendEmail({
                    email: emailToProcess,
                    subject: 'Voter Invitation',
                    message: `You have been invited to vote in ${organization.name}. Click the link to join: ${inviteLink}`,
                });
            }

            return { skipped: false, email: emailToProcess };
        };

        if (req.file) {
            const emails = [];
            const filePath = req.file.path;

            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => { if (row.email) emails.push(row.email); })
                .on('end', async () => {
                    const results = await Promise.all(emails.map(processEmail));
                    fs.unlinkSync(filePath);

                    const sent = results.filter(r => !r.skipped).length;
                    const skipped = results.filter(r => r.skipped).length;

                    res.status(200).json({
                        status: 'success',
                        message: `${sent} voter invitation(s) sent. ${skipped} skipped due to invalid domain.`,
                    });
                })
                .on('error', () => {
                    fs.unlinkSync(filePath);
                    return next(new AppError('Error reading CSV file', 500));
                });
        } else {
            const result = await processEmail(email);

            res.status(200).json({
                status: 'success',
                message: result.skipped
                    ? 'Email domain not allowed for this organization'
                    : 'Voter invitation sent successfully',
            });
        }
    }),
];

exports.acceptInvite = catchAsync(async (req, res, next) => {
    const { token } = req.body;

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return next(new AppError('Invalid or expired token', 400));
    }

    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { pendingInvites: true }
    });
    if (!user) return next(new AppError('User not found', 404));

    const hashedIncoming = hashToken(token);
    const invite = user.pendingInvites.find(i => i.token === hashedIncoming);
    if (!invite) return next(new AppError('Invite not found or already accepted', 400));

    const { organizationId, role, organizationName } = decoded;

    const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
    });
    if (!organization) return next(new AppError('Organization no longer exists', 404));

    if (!validateEmailDomain(user.email, organization)) {
        await prisma.pendingInvite.delete({ where: { id: invite.id } });
        return next(new AppError('Your email domain is no longer allowed for this organization', 400));
    }

    const existingMember = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId: user.id, organizationId } }
    });

    if (!existingMember) {
        await prisma.organizationMember.create({
            data: { userId: user.id, organizationId, role }
        });
    }

    await prisma.pendingInvite.delete({ where: { id: invite.id } });

    res.status(200).json({
        status: 'success',
        message: `You have joined ${organizationName} as ${role}`,
        organization,
    });
});

exports.declineInvite = catchAsync(async (req, res, next) => {
    const { token } = req.body;

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return next(new AppError('Invalid or expired token', 400));
    }

    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { pendingInvites: true }
    });
    if (!user) return next(new AppError('User not found', 404));

    const hashedIncoming = hashToken(token);
    const invite = user.pendingInvites.find(i => i.token === hashedIncoming);
    if (!invite) return next(new AppError('Invite not found or already handled', 400));

    await prisma.pendingInvite.delete({ where: { id: invite.id } });

    res.status(200).json({
        status: 'success',
        message: `You have declined the invite to join ${decoded.organizationName || 'this organization'}`,
    });
});

exports.getPendingInvites = catchAsync(async (req, res, next) => {
    const pendingInvites = await prisma.pendingInvite.findMany({
        where: { userId: req.user.id },
        include: { organization: true }
    });

    const invites = pendingInvites.map(invite => ({
        inviteId: invite.id,
        organizationId: invite.organizationId,
        organizationName: invite.organization.name,
        role: invite.role,
    }));

    res.status(200).json({
        status: 'success',
        results: invites.length,
        data: invites
    });
});