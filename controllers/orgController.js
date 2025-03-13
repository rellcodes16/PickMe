const Organization = require('../models/Org');
const User = require('../models/User');

const sendResponse = (res, statusCode, data) => {
    res.status(statusCode).json({
        status: 'success',
        data,
    });
};

exports.createOrganization = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Organization name is required' });
        }

        const existingOrg = await Organization.findOne({ name });
        if (existingOrg) {
            return res.status(400).json({ message: 'Organization name is already taken' });
        }

        const newOrganization = await Organization.create({ name });

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.organizationIds) {
            user.organizationIds = [];
        }

        if (!user.organizationIds.includes(newOrganization._id.toString())) {
            user.organizationIds.push(newOrganization._id);
        }

        if (!newOrganization.adminIds.includes(user._id.toString())) {
            newOrganization.adminIds.push(user._id);
        }

        user.role = 'admin';

        await newOrganization.save();
        await user.save();

        sendResponse(res, 201, { organization: newOrganization, user });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating organization' });
    }
};

exports.getUserOrganizations = async (req, res) => {
    try {
        const organizations = await Organization.find({ _id: { $in: req.user.organizationIds } });

        if (!organizations.length) {
            return res.status(404).json({ message: 'No organizations found' });
        }

        sendResponse(res, 200, { organizations });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching organizations' });
    }
};

exports.inviteUser = async (req, res) => {
    try {
        const { email, role, organizationId } = req.body;

        const organization = await Organization.findById(organizationId);
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        if (!organization.adminIds.includes(req.user.id)) {
            return res.status(403).json({ message: 'Only admins can invite users' });
        }

        let user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.organizationIds) {
            user.organizationIds = [];
        }

        if (!user.organizationIds.includes(organization._id.toString())) {
            user.organizationIds.push(organization._id);
        }

        user.role = role || 'voter';
        await user.save();

        sendResponse(res, 200, { message: 'User invited successfully', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error inviting user' });
    }
};

exports.assignAdmin = async (req, res) => {
    try {
        const { userId, organizationId } = req.body;

        const organization = await Organization.findById(organizationId);
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        if (!organization.adminIds.includes(req.user.id)) {
            return res.status(403).json({ message: 'Only admins can assign admin roles' });
        }

        const user = await User.findById(userId);
        if (!user || !user.organizationIds.includes(organization._id.toString())) {
            return res.status(404).json({ message: 'User not found in this organization' });
        }

        if (!organization.adminIds.includes(user._id.toString())) {
            organization.adminIds.push(user._id);
        }

        user.role = 'admin';
        await organization.save();
        await user.save();

        sendResponse(res, 200, { message: 'User assigned as admin', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error assigning admin role' });
    }
};

exports.removeUser = async (req, res) => {
    try {
        const { userId, organizationId } = req.body;

        const organization = await Organization.findById(organizationId);
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        if (!organization.adminIds.includes(req.user.id)) {
            return res.status(403).json({ message: 'Only admins can remove users' });
        }

        const user = await User.findById(userId);
        if (!user || !user.organizationIds.includes(organization._id.toString())) {
            return res.status(404).json({ message: 'User not found in this organization' });
        }

        if (String(user._id) === String(req.user.id)) {
            return res.status(400).json({ message: 'You cannot remove yourself' });
        }

        user.organizationIds = user.organizationIds.filter(
            (id) => id.toString() !== organization._id.toString()
        );

        await user.save();

        sendResponse(res, 200, { message: 'User removed successfully', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error removing user' });
    }
};
