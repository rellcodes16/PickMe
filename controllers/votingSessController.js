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

    const votingSessions = await VotingSession.find({ organization: organizationId })
        .populate('organization', 'name'); 

    res.status(200).json({
        status: "success",
        results: votingSessions.length,
        data: votingSessions
    });
});


exports.getAllUserVotingSessions = catchAsync(async (req, res, next) => {
    const userId = req.user._id;

    const user = await User.findById(userId).select('organizationIds');

    if (!user || !user.organizationIds || user.organizationIds.length === 0) {
        return res.status(200).json({
            status: "success",
            results: 0,
            data: [],
        });
    }

    const votingSessions = await VotingSession.find({
        organization: { $in: user.organizationIds },
    }).populate('organization');

    res.status(200).json({
        status: "success",
        results: votingSessions.length,
        data: votingSessions,
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
            path: "votes",
            populate: { 
                path: "candidate",
                populate: { path: "position" } 
            }
        })
        .populate("organization");

    if (!session) return next(new AppError("Voting session not found", 404));

    if (req.user.organizationId && req.user.organizationId.toString() !== session.organization._id.toString()) {
        return next(new AppError("You are not authorized to view this session", 403));
    }

    if (session.status !== "active") {
        return next(new AppError("Voting session is not active", 400));
    }

    const now = new Date();
    const sessionStart = new Date(session.startDate);
    const sessionEnd = session.endDate ? new Date(session.endDate) : now;
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

        formattedResults[position] = formattedResults[position].map(candidate => ({
            ...candidate,
            percentage: ((candidate.votes / totalVotes) * 100).toFixed(2)
        }));

        positionWinners[position] = winner;
    });

    res.status(200).json({
        status: "success",
        data: {
            votingSessionId: session._id,
            votingSessionName: session.title,  
            organizationId: session.organization._id,
            organizationName: session.organization.name,
            durationInHours,
            peakVotingTime,
            peakType,
            peakData,
            positionResults: formattedResults,
            positionWinners
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

exports.remindVoters = catchAsync(async (req, res, next) => {
    const sessionId = req.params.id;

    const session = await VotingSession.findById(sessionId);
    if (!session) return next(new AppError("Voting session not found", 404));

    if (session.status !== "active") {
        return next(new AppError("Voting session is not currently active", 400));
    }

    const allUsers = await User.find({ organizationIds: session.organization }).select("_id email name");

    const voters = await Vote.find({ votingSession: sessionId }).distinct("voter");
    const votersSet = new Set(voters.map(id => id.toString()));

    const nonVoters = allUsers.filter(user => !votersSet.has(user._id.toString()));

    if (nonVoters.length === 0) {
        return res.status(200).json({
            status: "success",
            message: "All users have voted"
        });
    }

    const notifications = nonVoters.map(user => ({
        user: user._id,
        message: `Reminder: You haven't voted in "${session.title}". Please cast your vote before it ends.`,
        type: "general",
        isRead: false
    }));
    await Notification.insertMany(notifications);

    await Promise.all(nonVoters.map(user => {
        return sendEmail({
            email: user.email,
            subject: `Reminder to Vote - ${session.title}`,
            html: `
                <p>Hi ${user.name || ""},</p>
                <p>This is a reminder that you haven’t yet voted in the ongoing session <strong>${session.title}</strong>.</p>
                <p>Make sure to cast your vote before it ends!</p>
            `
        });
    }));

    res.status(200).json({
        status: "success",
        message: `Reminders sent to ${nonVoters.length} users`
    });
});

