const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organization = require('../models/Org');
const catchAsync = require('../utils/catchAsync');
const crypto = require('crypto');
const { promisify } = require('util');
const sendEmail = require('../utils/sendEmail');
const AppError = require('../utils/apiError')

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

const createSendToken = async (user, statusCode, res) => {
    const token = signToken(user._id);

    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true,
        sameSite: 'None',
    };

    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

    res.cookie('jwt', token, cookieOptions);

    user.password = undefined;

    await user.populate('organizationIds');

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user,
        },
    });
};

exports.signup = catchAsync(async (req, res, next) => {
    const { name, email, password, passwordConfirm, organizationName, inviteToken } = req.body;

    let organizations = [];
    let role = 'voter';

    // 1️⃣ Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser && !inviteToken) {
        return next(new AppError('User with this email already exists', 400));
    }

    if (inviteToken) {
        try {
            const decoded = jwt.verify(inviteToken, process.env.JWT_SECRET);
            const organization = await Organization.findById(decoded.organizationId);

            if (!organization) {
                return next(new AppError('Invalid or expired invitation token', 400));
            }

            role = decoded.role || 'voter';
            organizations.push(organization._id);

            // ✅ If user exists, just add them to the organization
            if (existingUser) {
                if (!existingUser.organizationIds.includes(organization._id.toString())) {
                    existingUser.organizationIds.push(organization._id);
                    await existingUser.save();
                }
                return createSendToken(existingUser, 200, res);
            }
        } catch (err) {
            return next(new AppError('Invalid or expired invitation token', 400));
        }
    } else if (organizationName) {
        let organization = await Organization.findOne({ name: organizationName });

        if (!organization) {
            organization = await Organization.create({ name: organizationName });
            role = 'admin';
        }

        organizations.push(organization._id);
    }

    // 2️⃣ If user doesn’t exist, create a new user
    const newUser = await User.create({
        name,
        email,
        password,
        passwordConfirm,
        organizationIds: organizations,
        role,
    });

    // 3️⃣ Make new user admin if they created the organization
    for (let orgId of organizations) {
        const org = await Organization.findById(orgId);
        if (org && role === 'admin') {
            org.adminIds.push(newUser._id);
            await org.save();
        }
    }

    createSendToken(newUser, 201, res);
});


exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Incorrect email or password' });
    }

    createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) {
        return res.status(401).json({ message: 'You are not logged in' });
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id).populate('organizationIds');

    if (!currentUser) {
        return res.status(401).json({ message: 'User not found' });
    }

    req.user = currentUser;
    next();
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return res.status(404).json({ message: 'No user with this email' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    const resetURL = `${req.protocol}://${req.get('host')}/api/auth/resetPassword/${resetToken}`;
    const message = `Forgot your password? Reset it here: ${resetURL}`;

    await sendEmail({ email: user.email, subject: 'Password Reset', message });

    res.status(200).json({ message: 'Token sent to email' });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
        return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.password = await bcrypt.hash(req.body.password, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('+password');

    if (!(await bcrypt.compare(req.body.passwordCurrent, user.password))) {
        return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(req.body.password, 10);
    await user.save();

    createSendToken(user, 200, res);
});
