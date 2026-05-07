const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/apiError');
const prisma = require('../src/config/prisma');

const sendResponse = (res, statusCode, data) => {
    res.status(statusCode).json({ status: 'success', data });
};

exports.createOrganization = catchAsync(async (req, res, next) => {
    const { name, validEmailDomains = [], description } = req.body;

    if (!name) return next(new AppError('Organization name is required', 400));

    const existingOrg = await prisma.organization.findUnique({ where: { name } });
    if (existingOrg) return next(new AppError('Organization name is already taken', 400));

    const profilePicture = req.file ? req.file.path : '';
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return next(new AppError('User not found', 404));

    const userEmailDomain = user.email.split('@')[1];
    const allValidDomains = [...new Set([userEmailDomain, ...validEmailDomains])];

    const result = await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
            data: { name, description, profilePicture, validEmailDomains: allValidDomains }
        });

        await tx.organizationMember.create({
            data: { userId: user.id, organizationId: org.id, role: 'admin' }
        });

        return org;
    });

    sendResponse(res, 201, { organization: result, validEmailDomains: allValidDomains });
});

exports.updateOrganization = catchAsync(async (req, res, next) => {
    const { organizationId } = req.params;
    const { name } = req.body;

    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: { members: true }
    });
    if (!organization) return next(new AppError('Organization not found', 404));

    const isAdmin = organization.members.some(m => m.userId === req.user.id && m.role === 'admin');
    if (!isAdmin) return next(new AppError('Only admins can update organization details', 403));

    const updated = await prisma.organization.update({
        where: { id: organizationId },
        data: {
            ...(name && { name }),
            ...(req.file && { profilePicture: req.file.path })
        }
    });

    sendResponse(res, 200, { organization: updated });
});

exports.getUserOrganizations = catchAsync(async (req, res, next) => {
    const memberships = await prisma.organizationMember.findMany({
        where: { userId: req.user.id },
        include: { organization: true }
    });

    if (!memberships.length) return next(new AppError('No organizations found', 404));

    const organizations = memberships.map(m => m.organization);
    sendResponse(res, 200, { organizations });
});

exports.assignAdmin = catchAsync(async (req, res, next) => {
    const { userId, organizationId } = req.body;

    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: { members: true }
    });
    if (!organization) return next(new AppError('Organization not found', 404));

    const isAdmin = organization.members.some(m => m.userId === req.user.id && m.role === 'admin');
    if (!isAdmin) return next(new AppError('Only admins can assign admin roles', 403));

    const isMember = organization.members.some(m => m.userId === userId);
    if (!isMember) return next(new AppError('User not found in this organization', 404));

    const alreadyAdmin = organization.members.some(m => m.userId === userId && m.role === 'admin');
    if (alreadyAdmin) return next(new AppError('User is already an admin', 400));

    await prisma.organizationMember.update({
        where: { userId_organizationId: { userId, organizationId } },
        data: { role: 'admin' }
    });

    sendResponse(res, 200, { message: 'User assigned as admin' });
});

exports.removeMember = catchAsync(async (req, res, next) => {
    const { userId, organizationId } = req.body;

    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: { members: true }
    });
    if (!organization) return next(new AppError('Organization not found', 404));

    const isAdmin = organization.members.some(m => m.userId === req.user.id && m.role === 'admin');
    if (!isAdmin) return next(new AppError('Only admins can remove members', 403));

    const member = organization.members.find(m => m.userId === userId);
    if (!member) return next(new AppError('User not found in this organization', 404));

    if (member.role === 'admin') {
        return next(new AppError('Cannot remove an admin using this route', 403));
    }

    await prisma.organizationMember.delete({
        where: { userId_organizationId: { userId, organizationId } }
    });

    sendResponse(res, 200, { message: 'Member removed successfully' });
});

exports.removeAdmin = catchAsync(async (req, res, next) => {
    const { adminId, organizationId } = req.body;

    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: { members: { orderBy: { createdAt: 'asc' } } } // first member = creator
    });
    if (!organization) return next(new AppError('Organization not found', 404));

    const creator = organization.members[0];
    if (creator.userId !== req.user.id) {
        return next(new AppError('Only the first admin (creator) can remove admins', 403));
    }

    if (adminId === creator.userId) {
        return next(new AppError('The creator cannot remove themselves', 403));
    }

    const adminMember = organization.members.find(m => m.userId === adminId && m.role === 'admin');
    if (!adminMember) return next(new AppError('Admin not found in this organization', 404));

    await prisma.organizationMember.delete({
        where: { userId_organizationId: { userId: adminId, organizationId } }
    });

    sendResponse(res, 200, { message: 'Admin removed successfully' });
});

exports.leaveOrganization = catchAsync(async (req, res, next) => {
    const { organizationId } = req.body;

    if (!organizationId) return next(new AppError('Organization ID is required', 400));

    const member = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId: req.user.id, organizationId } }
    });

    if (!member) return next(new AppError('You are not a member of this organization', 400));

    const firstMember = await prisma.organizationMember.findFirst({
        where: { organizationId },
        orderBy: { createdAt: 'asc' }
    });

    if (firstMember.userId === req.user.id) {
        return next(new AppError('The creator cannot leave the organization', 403));
    }

    await prisma.organizationMember.delete({
        where: { userId_organizationId: { userId: req.user.id, organizationId } }
    });

    res.status(200).json({ message: 'You have successfully left the organization' });
});

exports.deleteOrganization = catchAsync(async (req, res, next) => {
    const { organizationId } = req.params;

    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: { members: { orderBy: { createdAt: 'asc' } } }
    });
    if (!organization) return next(new AppError('Organization not found', 404));

    const creator = organization.members[0];
    if (creator.userId !== req.user.id) {
        return next(new AppError('Only the organization creator can delete the organization', 403));
    }

    await prisma.organization.delete({ where: { id: organizationId } });

    res.status(200).json({ status: 'success', message: 'Organization deleted successfully' });
});