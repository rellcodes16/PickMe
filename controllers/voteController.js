const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/apiError");
const prisma = require('../src/config/prisma');

exports.castVote = catchAsync(async (req, res, next) => {
    const { votingSessionId, candidateId } = req.body;
    const userId = req.user.id;

    const votingSession = await prisma.votingSession.findUnique({
        where: { id: votingSessionId }
    });
    if (!votingSession || votingSession.status !== "active") {
        return next(new AppError("Voting session is not active.", 400));
    }

    const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId }
    });
    if (!candidate || candidate.votingSessionId !== votingSessionId) {
        return next(new AppError("Candidate not found or does not belong to this session.", 404));
    }

    const existingVote = await prisma.vote.findFirst({
        where: { userId, votingSessionId, position: candidate.position }
    });
    if (existingVote) {
        return next(new AppError(`You have already voted for ${candidate.position}.`, 400));
    }

    await prisma.$transaction(async (tx) => {
        await tx.vote.create({
            data: {
                userId,
                votingSessionId,
                candidateId,
                position: candidate.position
            }
        });

        await tx.candidate.update({
            where: { id: candidateId },
            data: { votes: { increment: 1 } }
        });

        await tx.votingSessionVoter.upsert({
            where: {
                votingSessionId_userId: { votingSessionId, userId }
            },
            create: { votingSessionId, userId },
            update: {}
        });
    });

    res.status(200).json({
        message: `Vote cast successfully for ${candidate.position}!`
    });
});

exports.getVotes = catchAsync(async (req, res, next) => {
    const { votingSessionId } = req.params;

    const votes = await prisma.vote.findMany({
        where: { votingSessionId },
        include: {
            candidate: { select: { position: true } },
            user: { select: { name: true, email: true } }
        }
    });

    if (!votes.length) {
        return next(new AppError("No votes found for this session.", 404));
    }

    res.status(200).json({ votes });
});