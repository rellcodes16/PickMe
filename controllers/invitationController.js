const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/apiError')
const sendEmail = require('../utils/sendEmail')
const Organization = require('../models/Org')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const mongoose = require('mongoose')

exports.inviteUser = catchAsync(async (req, res, next) => {
    const { email, role, organizationId } = req.body;

    console.log(req.body)

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
        return next(new AppError('Invalid organization ID format', 400));
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
        return next(new AppError('Organization not found', 404));
    }

    if (!organization.adminIds.includes(req.user.id)) {
        return next(new AppError('Only admins can invite users', 403));
    }

    const inviteToken = jwt.sign({ email, organizationId, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const inviteLink = `${req.protocol}://${req.get('host')}/signup?inviteToken=${inviteToken}`;

    let user = await User.findOne({ email });

    if (user) {
        user.pendingInvites.push({ organizationId, role, token: inviteToken });
        await user.save();
    } else {
        await sendEmail({
            email,
            subject: 'You have been invited!',
            message: `You have been invited to join ${organization.name}. Click the link to accept: ${inviteLink}`
        });
    }

    res.status(200).json({
        status: 'success',
        message: 'Invitation sent successfully',
        inviteLink
    });
});
