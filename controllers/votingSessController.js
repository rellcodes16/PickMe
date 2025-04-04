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
    const organization = req.params.organizationId; 
    const createdBy = req.user.id;

    console.log("Organization ID received:", organization);

    if (!mongoose.Types.ObjectId.isValid(organization)) {
        return next(new AppError("Invalid organization ID", 400));
    }

    const org = await Organization.findById(organization);
    console.log("Organization found:", org);

    if (!org) {
        return next(new AppError("Organization not found", 404));
    }

    const isAdmin = org.roles.some(role => role.userId.toString() === createdBy && role.role === 'admin');
    if (!isAdmin) {
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

exports.getActiveVotingSessions = catchAsync(async (req, res, next) => {
    const { organizationId } = req.params;

    const organization = await Organization.findById(organizationId);
    if (!organization) return next(new AppError('Organization not found', 404));

    const isAdmin = organization.roles.some(role => role.userId.toString() === req.user.id && role.role === 'admin');
    if (!isAdmin) {
        return next(new AppError('Only admins can view active voting sessions', 403));
    }

    const activeSessions = await VotingSession.find({ 
        organization: organizationId, 
        status: "active" 
    });

    res.status(200).json({
        status: "success",
        results: activeSessions.length,
        data: activeSessions
    });
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

    const organization = await Organization.findById(organizationId);
    const isAdmin = organization.roles.some(role => role.userId.toString() === userId && role.role === 'admin');
    if (!isAdmin) {
        return next(new AppError("Only admins can update this voting session", 403));
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

    const votingSession = await VotingSession.findById(sessionId);

    if (!votingSession) {
        return next(new AppError("Voting session not found", 404));
    }

    if (votingSession.organization.toString() !== organizationId) {
        return next(new AppError("Invalid organization for this session", 400));
    }

    if(votingSession.status === 'active'){
        return next(new AppError("Voting session can't be deleted when active", 403))
    }

    await votingSession.deleteOne();

    res.status(204).json({ status: "success", data: null });
});

exports.getVotingSessionAnalytics = catchAsync(async (req, res, next) => {
    const { sessionId } = req.params;

    const session = await VotingSession.findById(sessionId)
        .populate({
            path: "votes.candidate",
            populate: { path: "position" }
        });

    if (!session) return next(new AppError("Voting session not found", 404));

    if (session.status !== "ongoing") {
        return next(new AppError("Voting session is not active", 400));
    }

    const now = new Date();
    const sessionStart = new Date(session.startTime);
    const sessionEnd = session.endTime ? new Date(session.endTime) : now; 
    const durationInHours = (sessionEnd - sessionStart) / 1000 / 60 / 60; 

    let peakData = {};
    let peakType = durationInHours <= 24 ? "hourly" : "daily";

    session.votes.forEach(vote => {
        const voteTime = new Date(vote.timestamp);
        const key = peakType === "hourly"
            ? voteTime.getHours()
            : voteTime.toISOString().split("T")[0];

        peakData[key] = (peakData[key] || 0) + 1;
    });

    const peakVotingTime = Object.keys(peakData).reduce((a, b) => (peakData[a] > peakData[b] ? a : b), null);

    let positionResults = {};

    session.votes.forEach(vote => {
        const candidateId = vote.candidate._id.toString();
        const positionName = vote.candidate.position.name;

        if (!positionResults[positionName]) {
            positionResults[positionName] = {};
        }

        if (!positionResults[positionName][candidateId]) {
            positionResults[positionName][candidateId] = {
                name: vote.candidate.name,
                votes: 0
            };
        }

        positionResults[positionName][candidateId].votes += 1;
    });

    // **Determine Winner for Each Position**
    let positionWinners = {};
    let formattedResults = {};

    Object.keys(positionResults).forEach(position => {
        let maxVotes = 0;
        let winner = null;
        let totalVotes = 0;

        formattedResults[position] = [];

        Object.keys(positionResults[position]).forEach(candidateId => {
            const candidate = positionResults[position][candidateId];
            totalVotes += candidate.votes;

            formattedResults[position].push({
                name: candidate.name,
                votes: candidate.votes
            });

            if (candidate.votes > maxVotes) {
                maxVotes = candidate.votes;
                winner = { id: candidateId, name: candidate.name, votes: maxVotes };
            }
        });

        // Convert to percentage for frontend
        formattedResults[position] = formattedResults[position].map(candidate => ({
            ...candidate,
            percentage: ((candidate.votes / totalVotes) * 100).toFixed(2)
        }));

        positionWinners[position] = winner;
    });

    // **Prepare Analytics Response**
    res.status(200).json({
        status: "success",
        data: {
            votingSessionId: session._id,
            votingSessionName: session.name,
            durationInHours,
            peakVotingTime,
            peakType,
            peakData,  // Object for chart
            positionResults: formattedResults, // Results categorized by position
            positionWinners // Winners per position
        }
    });
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

