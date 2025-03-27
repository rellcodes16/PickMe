const Organization = require('../models/Org');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/apiError');

const sendResponse = (res, statusCode, data) => {
    res.status(statusCode).json({ status: 'success', data });
};

exports.createOrganization = catchAsync(async (req, res, next) => {
    const { name } = req.body;
    if (!name) return next(new AppError('Organization name is required', 400));

    const existingOrg = await Organization.findOne({ name });
    if (existingOrg) return next(new AppError('Organization name is already taken', 400));

    const profilePicture = req.file ? req.file.path : ''; 

    const newOrganization = await Organization.create({ name, profilePicture });

    const user = await User.findById(req.user.id);
    if (!user) return next(new AppError('User not found', 404));

    user.organizationIds.push(newOrganization._id);
    newOrganization.adminIds.push(user._id);
    user.role = 'admin';

    await newOrganization.save();
    await user.save();

    sendResponse(res, 201, { organization: newOrganization, user });
});

exports.updateOrganization = catchAsync(async (req, res, next) => {
    const { organizationId } = req.params; 
    const { name } = req.body;

    const organization = await Organization.findById(organizationId);
    if (!organization) return next(new AppError('Organization not found', 404));

    if (!organization.adminIds.includes(req.user.id)) {
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

    if (!organization.adminIds.includes(req.user.id)) {
        return next(new AppError('Only admins can assign admin roles', 403));
    }

    const user = await User.findById(userId);
    if (!user || !user.organizationIds.includes(organization._id.toString())) {
        return next(new AppError('User not found in this organization', 404));
    }

    if (!organization.adminIds.includes(user._id.toString())) {
        organization.adminIds.push(user._id);
    }

    user.role = 'admin';
    await organization.save();
    await user.save();

    sendResponse(res, 200, { message: 'User assigned as admin', user });
});

exports.removeUser = catchAsync(async (req, res, next) => {
    const { userId, organizationId } = req.body;

    const organization = await Organization.findById(organizationId);
    if (!organization) return next(new AppError('Organization not found', 404));

    if (!organization.adminIds.includes(req.user.id)) {
        return next(new AppError('Only admins can remove users', 403));
    }

    const user = await User.findById(userId);
    if (!user || !user.organizationIds.includes(organization._id.toString())) {
        return next(new AppError('User not found in this organization', 404));
    }

    if (String(user._id) === String(req.user.id)) {
        return next(new AppError('You cannot remove yourself', 400));
    }

    user.organizationIds = user.organizationIds.filter(
        (id) => id.toString() !== organization._id.toString()
    );

    await user.save();
    sendResponse(res, 200, { message: 'User removed successfully', user });
});