const Organization = require('../models/Org');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/apiError');

const sendResponse = (res, statusCode, data) => {
    res.status(statusCode).json({ status: 'success', data });
};

exports.createOrganization = catchAsync(async (req, res, next) => {
    const { name, validEmailDomains, description } = req.body;
    if (!name) return next(new AppError('Organization name is required', 400));

    const existingOrg = await Organization.findOne({ name });
    if (existingOrg) return next(new AppError('Organization name is already taken', 400));

    if (!Array.isArray(validEmailDomains) || validEmailDomains.length === 0) {
        return next(new AppError('At least one valid email domain is required', 400));
    }

    const profilePicture = req.file ? req.file.path : ''; 

    const user = await User.findById(req.user.id);
    if (!user) return next(new AppError('User not found', 404));

    const newOrganization = await Organization.create({ 
        name, 
        description, 
        profilePicture, 
        validEmailDomains, 
        voterIds: [], 
        // members: [{
        //     userId: user._id,
        //     name: user.name,
        //     profilePicture: user.profilePicture,  
        // }]
    });

    newOrganization.roles.push({ userId: user._id, role: 'admin' });
    user.organizationIds.push(newOrganization._id);
    user.role = 'admin';

    await newOrganization.save();
    await user.save();

    sendResponse(res, 201, { organization: newOrganization, user, validEmailDomains });
});

exports.updateOrganization = catchAsync(async (req, res, next) => {
    const { organizationId } = req.params; 
    const { name } = req.body;

    const organization = await Organization.findById(organizationId);
    if (!organization) return next(new AppError('Organization not found', 404));

    if (!organization.roles.some(role => role.userId.toString() === req.user.id && role.role === 'admin')) {
        return next(new AppError('Only admins can update organization details', 403));
    }

    if (name) organization.name = name;
    if (req.file) organization.profilePicture = req.file.path; 

    await organization.save();
    sendResponse(res, 200, { organization });
});


exports.getUserOrganizations = catchAsync(async (req, res, next) => {
    const organizations = await Organization.find({ _id: { $in: req.user.organizationIds } });

    if (!organizations.length) {
        return next(new AppError('No organizations found', 404));
    }

    sendResponse(res, 200, { organizations });
});

exports.assignAdmin = catchAsync(async (req, res, next) => {
    const { userId, organizationId } = req.body;

    const organization = await Organization.findById(organizationId);
    if (!organization) return next(new AppError('Organization not found', 404));

    if (!organization.roles.some(role => role.userId.toString() === req.user.id && role.role === 'admin')) {
        return next(new AppError('Only admins can assign admin roles', 403));
    }

    const user = await User.findById(userId);
    if (!user || !user.organizationIds.includes(organization._id.toString())) {
        return next(new AppError('User not found in this organization', 404));
    }

    if (organization.roles.some(role => role.userId.toString() === user._id.toString() && role.role === 'admin')) {
        return next(new AppError('User is already an admin', 400));
    }

    organization.roles.push({ userId: user._id, role: 'admin' });
    
    await organization.save();
    await user.save();

    sendResponse(res, 200, { message: 'User assigned as admin', user });
});

exports.removeMember = catchAsync(async (req, res, next) => {
    console.log('jfjjfjjf')
    const { userId, organizationId } = req.body;
    console.log(userId, organizationId)

    const organization = await Organization.findById(organizationId);
    console.log(organization)
    if (!organization) return next(new AppError('Organization not found', 404));

    const isAdmin = organization.roles.some(role => role.userId.toString() === req.user.id && role.role === 'admin');
    if (!isAdmin) {
        return next(new AppError('Only admins can remove members', 403));
    }

    const user = await User.findById(userId);
    if (!user || !user.organizationIds.includes(organization._id.toString())) {
        return next(new AppError('User not found in this organization', 404));
    }

    const isUserAdmin = organization.roles.some(role => role.userId.toString() === user._id.toString() && role.role === 'admin');
    if (isUserAdmin) {
        return next(new AppError('Cannot remove an admin using this route', 403));
    }

    organization.roles = organization.roles.filter(role => role.userId.toString() !== user._id.toString());


    user.organizationIds = user.organizationIds.filter(orgId => orgId.toString() !== organization._id.toString());

    await user.save();
    sendResponse(res, 200, { message: 'Member removed successfully', user });
});

exports.removeAdmin = catchAsync(async (req, res, next) => {
    const { adminId, organizationId } = req.body;

    const organization = await Organization.findById(organizationId);
    if (!organization) return next(new AppError('Organization not found', 404));

    const creatorRole = organization.roles[0]; 
    if (String(creatorRole.userId) !== String(req.user.id)) {
        return next(new AppError('Only the first admin (creator) can remove admins', 403));
    }

    const admin = await User.findById(adminId);
    if (!admin || !admin.organizationIds.includes(organization._id.toString())) {
        return next(new AppError('Admin not found in this organization', 404));
    }

    if (String(admin._id) === String(creatorRole.userId)) {
        return next(new AppError('The creator cannot remove themselves', 403));
    }

    organization.roles = organization.roles.filter(role => role.userId.toString() !== admin._id.toString() || role.role !== 'admin');

    admin.organizationIds = admin.organizationIds.filter(orgId => orgId.toString() !== organization._id.toString());

    await organization.save();
    await admin.save();

    sendResponse(res, 200, { message: 'Admin removed successfully', admin });
});

exports.leaveOrganization = catchAsync(async (req, res, next) => {
    console.log('🔹 Request received to leave organization');
    console.log('🔹 User:', req.user);

    if (!req.user) {
        console.log('❌ No user found in request');
        return next(new AppError('You are not logged in', 401));
    }

    const { organizationId } = req.body;
    console.log('🔹 Organization ID from request:', organizationId);

    if (!organizationId) {
        console.log('❌ No organizationId provided');
        return next(new AppError('Organization ID is required', 400));
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
        console.log('❌ Organization not found');
        return next(new AppError('Organization not found', 404));
    }

    console.log('🔹 User organizations:', req.user.organizationIds);
    console.log('🔹 Organization Admins:', organization.adminIds);


    console.log(req.user)

    const isMember = req.user.organizationIds.some(org => org._id.toString() === organization._id.toString());
    
    if (!isMember) {
        console.log('❌ User is not a member of this organization');
        return next(new AppError('You are not a member of this organization', 400));
    }

    if (String(organization.adminIds[0]) === String(req.user.id)) {
        console.log('❌ User is the creator and cannot leave');
        return next(new AppError('The creator cannot leave the organization', 403));
    }

    req.user.organizationIds = req.user.organizationIds.filter(
        (org) => org._id.toString() !== organization._id.toString()
    );

    organization.adminIds = organization.adminIds.filter(
        (id) => id.toString() !== req.user.id
    );

    await req.user.save();
    await organization.save();

    console.log('✅ User successfully left organization');
    res.status(200).json({ message: 'You have successfully left the organization' });
});

exports.deleteOrganization = catchAsync(async (req, res, next) => {
    const { organizationId } = req.params;

    const organization = await Organization.findById(organizationId);
    if (!organization) return next(new AppError('Organization not found', 404));

    if (organization.adminIds[0].toString() !== req.user.id) {
        return next(new AppError('Only the organization creator can delete the organization', 403));
    }

    const usersInOrganization = await User.find({ organizationIds: organizationId });
    for (const user of usersInOrganization) {
        user.organizationIds = user.organizationIds.filter(id => id.toString() !== organizationId);

        user.roles = user.roles.filter(role => role.organizationId.toString() !== organizationId);
        await user.save();
    }

    await VotingSession.deleteMany({ organizationId });

    await organization.remove();

    res.status(200).json({
        status: 'success',
        message: 'Organization deleted successfully',
    });
});
