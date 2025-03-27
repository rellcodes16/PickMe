const mongoose = require('mongoose')
const VotingSession = require("../models/VotingSess");
const Organization = require("../models/Org");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/apiError");
const User = require("../models/User")

exports.createVotingSession = catchAsync(async (req, res, next) => {
    console.log("Request body:", req.body);
    console.log("Request params:", req.params);

    const { title, startDate, endDate, candidates, voters } = req.body;
    const organization = req.params.organizationId; // ✅ Get it from req.params
    const createdBy = req.user.id;

    console.log("Organization ID received:", organization);

    // Ensure organizationId is valid
    if (!mongoose.Types.ObjectId.isValid(organization)) {
        return next(new AppError("Invalid organization ID", 400));
    }

    const org = await Organization.findById(organization);
    console.log("Organization found:", org);

    if (!org) {
        return next(new AppError("Organization not found", 404));
    }

    if (!org.adminIds || !Array.isArray(org.adminIds) || !org.adminIds.includes(createdBy)) {
        return next(new AppError("Unauthorized: Only admins can create voting sessions", 403));
    }

    const votingSession = await VotingSession.create({
        title,
        organization: org._id,  
        createdBy,
        startDate,
        endDate,
        candidates,
        voters,
        status: "pending"
    });

    res.status(201).json({
        status: "success",
        data: votingSession
    });
});


exports.getVotingSessions = catchAsync(async (req, res, next) => {
    const { organizationId } = req.params;

    const org = await Organization.findById(organizationId);
    if (!org) {
        return next(new AppError("Organization not found", 404));
    }

    const votingSessions = await VotingSession.find({ organization: organizationId });

    res.status(200).json({
        status: "success",
        results: votingSessions.length,
        data: votingSessions
    });
});

exports.getVotingSession = catchAsync(async (req, res, next) => {
    const { sessionId } = req.params;
    const session = await VotingSession.findById(sessionId);

    if (!session) {
        return next(new AppError("Voting session not found", 404))
    }

    res.status(200).json({ success: true, session });
});


exports.updateVotingSession = catchAsync(async (req, res, next) => {
    const { organizationId, sessionId } = req.params; 
    const updates = req.body;
    const userId = req.user.id;

    const votingSession = await VotingSession.findById(sessionId);
    if (!votingSession) {
        return next(new AppError("Voting session not found", 404));
    }

    if (votingSession.organization.toString() !== organizationId) {
        return next(new AppError("Invalid organization for this session", 400));
    }

    if (updates.status) {
        return next(new AppError("You cannot manually update the session status", 400));
    }

    Object.assign(votingSession, updates);
    await votingSession.save();

    res.status(200).json({
        status: "success",
        data: votingSession
    });
});

exports.deleteVotingSession = catchAsync(async (req, res, next) => {
    const { organizationId, sessionId } = req.params;
    const userId = req.user.id;

    const votingSession = await VotingSession.findById(sessionId);
    if (!votingSession) {
        return next(new AppError("Voting session not found", 404));
    }

    if (votingSession.organization.toString() !== organizationId) {
        return next(new AppError("Invalid organization for this session", 400));
    }

    await votingSession.deleteOne();

    res.status(204).json({ status: "success", data: null });
});


exports.startVotingSession = catchAsync(async (req, res, next) => {
    const { sessionId, organizationId } = req.params;

    const votingSession = await VotingSession.findById(sessionId);
    if (!votingSession) {
        return next(new AppError("Voting session not found", 404));
    }

    if (votingSession.organization.toString() !== String(organizationId)) {
        return next(new AppError("Voting session does not belong to this organization", 400));
    }

    if (votingSession.status !== "pending") {
        return next(new AppError("Voting session cannot be started", 400));
    }

    const users = await User.find({ organizationIds: votingSession.organization }).select("_id");

    if (!users.length) {
        return next(new AppError("No users found in this organization.", 400));
    }

    votingSession.status = "active";
    await votingSession.save();

    const notifications = users.map(user => ({
        user: user._id,
        message: `The voting session "${votingSession.title}" has started. You can now cast your votes!`,
        type: "voting_start",
        isRead: false
    }));

    await Notification.insertMany(notifications);
    console.log("📩 Notifications inserted for all users.");

    res.status(200).json({
        status: "success",
        data: votingSession
    });
});

exports.endVotingSession = catchAsync(async (req, res, next) => {
    const { sessionId, organizationId } = req.params;

    const votingSession = await VotingSession.findById(sessionId);
    if (!votingSession) {
        return next(new AppError("Voting session not found", 404));
    }

    if (votingSession.organization.toString() !== String(organizationId)) {
        return next(new AppError("Voting session does not belong to this organization", 400));
    }

    if (votingSession.status !== "active") {
        return next(new AppError("Voting session is not active", 400));
    }

    const users = await User.find({ organizationIds: votingSession.organization }).select("_id");

    if (!users.length) {
        return next(new AppError("No users found in this organization.", 400));
    }

    votingSession.status = "closed";
    await votingSession.save();

    const notifications = users.map(user => ({
        user: user._id,
        message: `The voting session "${votingSession.title}" has ended. You can now check the results.`,
        type: "voting_result",
        isRead: false
    }));

    await Notification.insertMany(notifications);
    console.log("📩 Notifications inserted for all users.");

    res.status(200).json({
        status: "success",
        data: votingSession
    });
});

