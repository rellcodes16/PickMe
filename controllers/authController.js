const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organization = require('../models/Org');
const catchAsync = require('../utils/catchAsync');
const crypto = require('crypto');
const { promisify } = require('util');
const sendEmail = require('../utils/sendEmail');
const AppError = require('../utils/apiError')
const VotingSession = require('../models/VotingSess')

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
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        secure: process.env.NODE_ENV === 'production', 
    };

    res.cookie('jwt', token, cookieOptions);

    user.password = undefined;

    await user.populate({
        path: 'organizationIds',
        populate: {
            path: 'roles.userId',
            select: 'role', 
        }
    });

    res.status(statusCode).json({
        status: 'success',
        token,
        data: { user },
    });
};

exports.signup = catchAsync(async (req, res, next) => {
    const { name, email, password, passwordConfirm, organizationName, inviteToken } = req.body;
    let profilePicture = req.file ? req.file.path : undefined;

    let organizations = [];
    let role = 'voter';
    let votingSessionId = null;

    let emailFromToken = null;

    if (inviteToken) {
        try {
            const decoded = jwt.verify(inviteToken, process.env.JWT_SECRET);
            emailFromToken = decoded.email;

            const organization = await Organization.findById(decoded.organizationId);

            if (!organization) {
                return next(new AppError('Invalid or expired invitation token', 400));
            }

            const emailDomain = emailFromToken.split('@')[1];
            if (!organization.validEmailDomains.includes(emailDomain)) {
                return next(new AppError('Your email domain is not allowed for this organization', 400));
            }

            role = decoded.role || 'voter';
            votingSessionId = decoded.votingSessionId || null;
            organizations.push(organization._id);

            const existingUser = await User.findOne({ email: emailFromToken });
            if (existingUser) {
                return createSendToken(existingUser, 200, res);
            }
        } catch (err) {
            return next(new AppError('Invalid or expired invitation token', 400));
        }
    }

    if (!email && !emailFromToken) return next(new AppError('Email is required', 400));

    const finalEmail = emailFromToken || email;

    const existingUser = await User.findOne({ email: finalEmail });
    if (existingUser && !inviteToken) {
        return next(new AppError('User with this email already exists', 400));
    }

    if (organizationName) {
        const newOrganization = await Organization.create({
            name: organizationName,
            roles: [], 
            validEmailDomains: [finalEmail.split('@')[1]],
        });
        organizations.push(newOrganization._id); 

        const newUser = await User.create({
            name,
            email: finalEmail,
            password,
            passwordConfirm,
            profilePicture,
            organizationIds: organizations,
            role: 'admin', 
        });

        const org = await Organization.findById(newOrganization._id);
        if (org) {
            org.roles.push({ userId: newUser._id, role: 'admin' });
            await org.save();
        }

        createSendToken(newUser, 201, res);
        return; 
    }

    const newUser = await User.create({
        name,
        email: finalEmail,
        password,
        passwordConfirm,
        profilePicture,
        organizationIds: organizations,
        role,
    });

    for (let orgId of organizations) {
        const org = await Organization.findById(orgId);
        if (org) {
            org.roles.push({ userId: newUser._id, role });
            await org.save();
        }
    }

    if (role === 'voter' && votingSessionId) {
        const votingSession = await VotingSession.findById(votingSessionId);
        if (votingSession) {
            votingSession.voters.push(newUser._id);
            await votingSession.save();
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

exports.updateUser = catchAsync(async (req, res, next) => {
    const { name, email } = req.body;
    let profilePicture = req.file ? req.file.path : undefined;

    const updatedFields = {};
    if (name) updatedFields.name = name;
    if (profilePicture) updatedFields.profilePicture = profilePicture;

    if (email) {
        const emailDomain = email.split('@')[1];

        const organization = await Organization.findOne({ _id: req.user.organizationId });

        if (!organization) {
            return next(new AppError('User is not associated with any organization', 400));
        }

        if (!organization.validEmailDomains.includes(emailDomain)) {
            return next(new AppError('Your new email domain is not allowed for this organization', 400));
        }

        updatedFields.email = email;
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updatedFields, {
        new: true,
        runValidators: true,
    });

    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser,
        },
    });
});

exports.protect = catchAsync(async (req, res, next) => {
    let token;

    console.log('Checking for token...');

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
        console.log('Token found in headers:', token);
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
        console.log('Token found in cookies:', token);
    }

    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ message: 'You are not logged inn!' });
    }

    let decoded;
    try {
        decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
        console.log('Decoded token:', decoded);
    } catch (err) {
        console.log('Invalid token:', err.message);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const currentUser = await User.findById(decoded.id).populate({
        path: 'organizationIds',
        populate: {
            path: 'roles.userId',
            select: 'role'
        }
    });

    if (!currentUser) {
        console.log('User not found in database');
        return res.status(401).json({ message: 'User not found' });
    }

    console.log('User authenticated:', currentUser);
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

    user.password = req.body.password; 
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

    user.password = req.body.password;
    await user.save();

    createSendToken(user, 200, res);
});

exports.updateCurrentPassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  const isCurrentPasswordCorrect = await bcrypt.compare(
    req.body.passwordCurrent,
    user.password
  );

  if (!isCurrentPasswordCorrect) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }

  user.password = await bcrypt.hash(req.body.password, 10);
  await user.save();

  createSendToken(user, 200, res);
});


exports.isAdmin = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const { sessionId } = req.params;

    const session = await VotingSession.findById(sessionId);
    if (!session) {
        return next(new AppError("Voting session not found", 404));
    }

    const organization = await Organization.findById(session.organization);
    if (!organization) {
        return next(new AppError("Organization not found", 404));
    }

    if (!organization.roles || !Array.isArray(organization.roles)) {
        throw new AppError("Organization roles not properly set up", 500);
    }

    const roleObj = organization.roles.find(role => role.userId.toString() === userId.toString());
    if (!roleObj || roleObj.role !== 'admin') {
        return next(new AppError("Access denied. Admins only.", 403));
    }

    next();
});

exports.updateEmailDomains = catchAsync(async (req, res, next) => {
    const { validEmailDomains } = req.body;
    const { id } = req.params;

    if (!Array.isArray(validEmailDomains) || validEmailDomains.length === 0) {
        return next(new AppError('At least one valid email domain is required', 400));
    }

    const organization = await Organization.findById(id);
    if (!organization) return next(new AppError('Organization not found', 404));

    const userRole = organization.roles.find(role => role.userId.toString() === req.user.id.toString());
    if (!userRole || userRole.role !== 'admin') {
        return next(new AppError('Only admins can update email domains', 403));
    }

    organization.validEmailDomains = validEmailDomains;
    await organization.save();

    res.status(200).json({
        status: 'success',
        data: { organization }
    });
});
