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




