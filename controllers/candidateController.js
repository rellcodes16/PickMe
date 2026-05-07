const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/apiError");
const prisma = require('../src/config/prisma');

exports.createCandidate = catchAsync(async (req, res, next) => {
    const { userId, position, votingSessionId } = req.body;

    if (!userId || !position || !votingSessionId) {
        return next(new AppError("All fields are required.", 400));
    }

    const votingSession = await prisma.votingSession.findUnique({
        where: { id: votingSessionId }
    });
    if (!votingSession) return next(new AppError("Voting session not found.", 404));

    const existingCandidate = await prisma.candidate.findFirst({
        where: { userId, position, votingSessionId }
    });
    if (existingCandidate) {
        return next(new AppError("User is already a candidate for this position.", 400));
    }

    const newCandidate = await prisma.candidate.create({
        data: { userId, position, votingSessionId }
    });

    res.status(201).json({
        message: "Candidate created successfully!",
        candidate: newCandidate,
    });
});

exports.getCandidates = catchAsync(async (req, res, next) => {
    const { votingSessionId } = req.params;

    const candidates = await prisma.candidate.findMany({
        where: { votingSessionId },
        include: {
            user: { select: { name: true, profilePicture: true } }
        }
    });

    if (!candidates.length) {
        return next(new AppError("No candidates found for this session.", 404));
    }

    res.status(200).json({ candidates });
});

exports.updateCandidate = catchAsync(async (req, res, next) => {
    const { candidateId } = req.params;
    const { position } = req.body;

    const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) return next(new AppError("Candidate not found.", 404));

    const updated = await prisma.candidate.update({
        where: { id: candidateId },
        data: {
            ...(position && { position }),
        }
    });

    res.status(200).json({
        message: "Candidate updated successfully!",
        candidate: updated,
    });
});