const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/apiError");
const sendEmail = require('../utils/sendEmail');
const prisma = require('../src/config/prisma');
const { createAndPushManyNotifications } = require('../utils/notificationService');

exports.createVotingSession = catchAsync(async (req, res, next) => {
    const { title, startDate, endDate } = req.body;
    const { organizationId } = req.params;
    const createdById = req.user.id;

    const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: { members: true }
    });
    if (!org) return next(new AppError("Organization not found", 404));

    const isAdmin = org.members.some(m => m.userId === createdById && m.role === 'admin');
    if (!isAdmin) return next(new AppError("Unauthorized: Only admins can create voting sessions", 403));

    const votingSession = await prisma.votingSession.create({
        data: {
            title,
            organizationId,
            createdById,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            status: 'pending',
        }
    });

    res.status(201).json({ status: "success", data: votingSession });
});

exports.getVotingSessions = catchAsync(async (req, res, next) => {
    const { organizationId } = req.params;

    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) return next(new AppError("Organization not found", 404));

    const votingSessions = await prisma.votingSession.findMany({
        where: { organizationId },
        include: { organization: { select: { name: true } } }
    });

    res.status(200).json({
        status: "success",
        results: votingSessions.length,
        data: votingSessions
    });
});

exports.getAllUserVotingSessions = catchAsync(async (req, res, next) => {
    const userId = req.user.id;

    const memberships = await prisma.organizationMember.findMany({
        where: { userId },
        select: { organizationId: true }
    });

    if (!memberships.length) {
        return res.status(200).json({ status: "success", results: 0, data: [] });
    }

    const orgIds = memberships.map(m => m.organizationId);

    const votingSessions = await prisma.votingSession.findMany({
        where: { organizationId: { in: orgIds } },
        include: { organization: true }
    });

    res.status(200).json({
        status: "success",
        results: votingSessions.length,
        data: votingSessions
    });
});

exports.getVotingSession = catchAsync(async (req, res, next) => {
    const { sessionId } = req.params;

    const session = await prisma.votingSession.findUnique({ where: { id: sessionId } });
    if (!session) return next(new AppError("Voting session not found", 404));

    res.status(200).json({ success: true, session });
});

exports.getActiveVotingSessions = catchAsync(async (req, res, next) => {
    const { organizationId } = req.params;

    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: { members: true }
    });
    if (!organization) return next(new AppError('Organization not found', 404));

    const isAdmin = organization.members.some(m => m.userId === req.user.id && m.role === 'admin');
    if (!isAdmin) return next(new AppError('Only admins can view active voting sessions', 403));

    const activeSessions = await prisma.votingSession.findMany({
        where: { organizationId, status: 'active' }
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

    const votingSession = await prisma.votingSession.findUnique({ where: { id: sessionId } });
    if (!votingSession) return next(new AppError("Voting session not found", 404));

    if (votingSession.organizationId !== organizationId) {
        return next(new AppError("Invalid organization for this session", 400));
    }

    if (updates.status) {
        return next(new AppError("You cannot manually update the session status", 400));
    }

    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: { members: true }
    });

    const isAdmin = organization.members.some(m => m.userId === userId && m.role === 'admin');
    if (!isAdmin) return next(new AppError("Only admins can update this voting session", 403));

    const updated = await prisma.votingSession.update({
        where: { id: sessionId },
        data: {
            ...(updates.title && { title: updates.title }),
            ...(updates.startDate && { startDate: new Date(updates.startDate) }),
            ...(updates.endDate && { endDate: new Date(updates.endDate) }),
        }
    });

    res.status(200).json({ status: "success", data: updated });
});

exports.deleteVotingSession = catchAsync(async (req, res, next) => {
    const { organizationId, sessionId } = req.params;

    const votingSession = await prisma.votingSession.findUnique({ where: { id: sessionId } });
    if (!votingSession) return next(new AppError("Voting session not found", 404));

    if (votingSession.organizationId !== organizationId) {
        return next(new AppError("Invalid organization for this session", 400));
    }

    if (votingSession.status === 'active') {
        return next(new AppError("Voting session can't be deleted when active", 403));
    }

    await prisma.votingSession.delete({ where: { id: sessionId } });

    res.status(204).json({ status: "success", data: null });
});

exports.startVotingSession = catchAsync(async (req, res, next) => {
    const { sessionId, organizationId } = req.params;

    const votingSession = await prisma.votingSession.findUnique({ where: { id: sessionId } });
    if (!votingSession) return next(new AppError("Voting session not found", 404));

    if (votingSession.organizationId !== organizationId) {
        return next(new AppError("Voting session does not belong to this organization", 400));
    }

    if (votingSession.status !== 'pending') {
        return next(new AppError("Voting session cannot be started", 400));
    }

    const candidateCount = await prisma.candidate.count({ where: { votingSessionId: sessionId } });
    if (candidateCount === 0) {
        return next(new AppError("Cannot start a session with no candidates", 400));
    }

    const members = await prisma.organizationMember.findMany({
        where: { organizationId: votingSession.organizationId },
        select: { userId: true }
    });

    if (!members.length) return next(new AppError("No users found in this organization.", 400));

    const updated = await prisma.votingSession.update({
        where: { id: sessionId },
        data: { status: 'active' }
    });

    await createAndPushManyNotifications(
        members.map(m => ({
            userId: m.userId,
            message: `The voting session "${votingSession.title}" has started. You can now cast your votes!`,
            type: 'voting_start',
            isRead: false
        }))
    );

    res.status(200).json({ status: "success", data: updated });
});

exports.endVotingSession = catchAsync(async (req, res, next) => {
    const { sessionId, organizationId } = req.params;

    const votingSession = await prisma.votingSession.findUnique({ where: { id: sessionId } });
    if (!votingSession) return next(new AppError("Voting session not found", 404));

    if (votingSession.organizationId !== organizationId) {
        return next(new AppError("Voting session does not belong to this organization", 400));
    }

    if (votingSession.status !== 'active') {
        return next(new AppError("Voting session is not active", 400));
    }

    const members = await prisma.organizationMember.findMany({
        where: { organizationId: votingSession.organizationId },
        select: { userId: true }
    });

    if (!members.length) return next(new AppError("No users found in this organization.", 400));

    const updated = await prisma.votingSession.update({
        where: { id: sessionId },
        data: { status: 'closed' }
    });

    await createAndPushManyNotifications(
        members.map(m => ({
            userId: m.userId,
            message: `The voting session "${votingSession.title}" has ended. You can now check the results.`,
            type: 'voting_result',
            isRead: false
        }))
    );

    res.status(200).json({ status: "success", data: updated });
});

exports.remindVoters = catchAsync(async (req, res, next) => {
    const { id: sessionId } = req.params;

    const session = await prisma.votingSession.findUnique({ where: { id: sessionId } });
    if (!session) return next(new AppError("Voting session not found", 404));

    if (session.status !== 'active') {
        return next(new AppError("Voting session is not currently active", 400));
    }

    const members = await prisma.organizationMember.findMany({
        where: { organizationId: session.organizationId },
        include: { user: { select: { id: true, email: true, name: true } } }
    });

    const voted = await prisma.vote.findMany({
        where: { votingSessionId: sessionId },
        select: { userId: true }
    });

    const votedIds = new Set(voted.map(v => v.userId));
    const nonVoters = members.filter(m => !votedIds.has(m.userId)).map(m => m.user);

    if (!nonVoters.length) {
        return res.status(200).json({ status: "success", message: "All users have voted" });
    }

    await createAndPushManyNotifications(
        nonVoters.map(user => ({
            userId: user.id,
            message: `Reminder: You haven't voted in "${session.title}". Please cast your vote before it ends.`,
            type: 'general',
            isRead: false
        }))
    );

    await Promise.all(nonVoters.map(user =>
        sendEmail({
            email: user.email,
            subject: `Reminder to Vote - ${session.title}`,
            html: `
                <p>Hi ${user.name || ""},</p>
                <p>This is a reminder that you haven't yet voted in the ongoing session <strong>${session.title}</strong>.</p>
                <p>Make sure to cast your vote before it ends!</p>
            `
        })
    ));

    res.status(200).json({
        status: "success",
        message: `Reminders sent to ${nonVoters.length} users`
    });
});

exports.getVotingSessionAnalytics = catchAsync(async (req, res, next) => {
    const { sessionId } = req.params;

    const session = await prisma.votingSession.findUnique({
        where: { id: sessionId },
        include: {
            organization: true,
            votes: { include: { candidate: true } }
        }
    });

    if (!session) return next(new AppError("Voting session not found", 404));
    if (session.status !== 'active') return next(new AppError("Voting session is not active", 400));

    const now = new Date();
    const sessionStart = new Date(session.startDate);
    const sessionEnd = session.endDate ? new Date(session.endDate) : now;
    const durationInHours = (sessionEnd - sessionStart) / 1000 / 60 / 60;

    let peakData = {};
    const peakType = durationInHours <= 24 ? "hourly" : "daily";

    session.votes.forEach(vote => {
        const voteTime = new Date(vote.createdAt);
        const key = peakType === "hourly"
            ? voteTime.getHours()
            : voteTime.toISOString().split("T")[0];
        peakData[key] = (peakData[key] || 0) + 1;
    });

    const peakVotingTime = Object.keys(peakData).reduce(
        (a, b) => (peakData[a] > peakData[b] ? a : b), null
    );

    let positionResults = {};

    session.votes.forEach(vote => {
        const candidateId = vote.candidateId;
        const position = vote.candidate.position;

        if (!positionResults[position]) positionResults[position] = {};
        if (!positionResults[position][candidateId]) {
            positionResults[position][candidateId] = { votes: 0 };
        }

        positionResults[position][candidateId].votes += 1;
    });

    let positionWinners = {};
    let formattedResults = {};

    Object.keys(positionResults).forEach(position => {
        let maxVotes = 0;
        let winner = null;
        let totalVotes = 0;
        formattedResults[position] = [];

        Object.keys(positionResults[position]).forEach(candidateId => {
            const { votes } = positionResults[position][candidateId];
            totalVotes += votes;
            formattedResults[position].push({ candidateId, votes });
            if (votes > maxVotes) {
                maxVotes = votes;
                winner = { id: candidateId, votes };
            }
        });

        formattedResults[position] = formattedResults[position].map(c => ({
            ...c,
            percentage: ((c.votes / totalVotes) * 100).toFixed(2)
        }));

        positionWinners[position] = winner;
    });

    res.status(200).json({
        status: "success",
        data: {
            votingSessionId: session.id,
            votingSessionName: session.title,
            organizationId: session.organization.id,
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