const csv = require('csv-parser');
const multer = require('multer');
const fs = require('fs');
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/apiError')
const sendEmail = require('../utils/sendEmail')
const Organization = require('../models/Org')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const mongoose = require('mongoose')

const upload = multer({ dest: 'uploads/' });

exports.inviteAdmin = catchAsync(async (req, res, next) => {
    const { email, organizationId } = req.body;

    const organization = await Organization.findById(organizationId);
    const creatorId = organization.roles[0].userId;

    if (!organization) return next(new AppError('Organization not found', 404));
    if (creatorId.toString() !== req.user.id) {
        return next(new AppError('Only the organization creator can invite admins', 403));
    }

    const inviteToken = jwt.sign({ 
        email, 
        organizationId,
        organizationName: organization.name,
        role: 'admin' 
    }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const inviteLink = `${req.protocol}://${req.get('host')}/signup?inviteToken=${inviteToken}`;

    let user = await User.findOne({ email });
    if (user) {
        user.pendingInvites.push({ 
            organizationId, 
            token: inviteToken 
        });
        await user.save();
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

        if (req.file) {
            const emails = [];
            const filePath = req.file.path;

            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    if (row.email) emails.push(row.email);
                })
                .on('end', async () => {
                    const organization = await Organization.findById(organizationId);
                    if (!organization) return next(new AppError('Organization not found', 404));

                    for (const email of emails) {
                        let user = await User.findOne({ email });

                        if (user) {
                            const isUserInOrg = organization.roles.some(role => role.userId.toString() === user._id.toString());

                            if (!isUserInOrg) {
                                organization.roles.push({ userId: user._id, role: 'voter' });
                            }

                            await organization.save();
                        } else {
                            const inviteToken = jwt.sign({
                                email,
                                organizationId,
                                organizationName: organization.name,
                                role: 'voter'
                            }, process.env.JWT_SECRET, { expiresIn: '7d' });

                            const inviteLink = `${req.protocol}://${req.get('host')}/signup?inviteToken=${inviteToken}`;

                            await sendEmail({
                                email,
                                subject: 'Voter Invitation',
                                message: `You have been invited to vote in the organization. Click the link to join: ${inviteLink}`,
                            });
                        }
                    }

                    fs.unlinkSync(filePath);

                    res.status(200).json({
                        status: 'success',
                        message: `${emails.length} voter invitations sent successfully`,
                    });
                })
                .on('error', (err) => {
                    fs.unlinkSync(filePath);
                    return next(new AppError('Error reading CSV file', 500));
                });
        } else {
            const organization = await Organization.findById(organizationId);
            if (!organization) return next(new AppError('Organization not found', 404));

            let user = await User.findOne({ email });

            if (user) {
                const isUserInOrg = organization.roles.some(role => role.userId.toString() === user._id.toString());
                if (!isUserInOrg) {
                    organization.roles.push({ userId: user._id, role: 'voter' });
                }

                await organization.save();
            } else {
                const inviteToken = jwt.sign({
                    email,
                    organizationId,
                    role: 'voter'
                }, process.env.JWT_SECRET, { expiresIn: '7d' });

                const inviteLink = `${req.protocol}://${req.get('host')}/signup?inviteToken=${inviteToken}`;

                await sendEmail({
                    email,
                    subject: 'Voter Invitation',
                    message: `You have been invited to vote in the organization. Click the link to join: ${inviteLink}`,
                });
            }

            res.status(200).json({
                status: 'success',
                message: 'Voter invitation sent successfully',
            });
        }
    }),
];

exports.acceptInvite = catchAsync(async (req, res, next) => {
    const { token } = req.body;
    let decoded;
  
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return next(new AppError('Invalid or expired token', 400));
    }
  
    const user = await User.findById(req.user.id);
    if (!user) return next(new AppError('User not found', 404));
  
    const inviteIndex = user.pendingInvites.findIndex(invite => invite.token === token);
    if (inviteIndex === -1) {
      return next(new AppError('Invite not found or already accepted', 400));
    }
  
    const { organizationId, role, organizationName } = decoded;
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return next(new AppError('Organization no longer exists', 404));
    }
  
    const userIdStr = String(user._id);
  
    const isAlreadyMember = organization.roles.some(r => String(r.userId) === userIdStr);
    if (!isAlreadyMember) {
      organization.roles.push({ userId: user._id, role });
      await organization.save();
    }
  
    const isOrgInUser = user.organizationIds.some(id => String(id) === String(organizationId));
    if (!isOrgInUser) {
      user.organizationIds.push(organizationId);
    }
  
    user.pendingInvites.splice(inviteIndex, 1);
    await user.save();
  
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
    } catch (err) {
      return next(new AppError('Invalid or expired token', 400));
    }
  
    const user = await User.findById(req.user.id);
    if (!user) return next(new AppError('User not found', 404));
  
    const inviteIndex = user.pendingInvites.findIndex(invite => invite.token === token);
    if (inviteIndex === -1) {
      return next(new AppError('Invite not found or already handled', 400));
    }

    user.pendingInvites.splice(inviteIndex, 1);
    await user.save();
  
    res.status(200).json({
      status: 'success',
      message: `You have declined the invite to join ${decoded.organizationName || 'this organization'}`,
    });
  });

exports.getPendingInvites = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id);
  
    const invites = await Promise.all(
      user.pendingInvites.map(async (inviteObj) => {
        try {
          const decoded = jwt.verify(inviteObj.token, process.env.JWT_SECRET);
  
          return {
            token: inviteObj.token,
            organizationId: decoded.organizationId,
            organizationName: decoded.organizationName,
            role: decoded.role,
          };
        } catch (err) {
          return null;
        }
      })
    );
  
    const validInvites = invites.filter(Boolean);
  
    res.status(200).json({
      status: 'success',
      results: validInvites.length,
      data: validInvites
    });
});
  